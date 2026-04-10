# HeartType 技术方案文档
## Web端后端服务设计 v1.0

---

# 一、系统概述

## 1.1 系统定位

HeartType 是一款恋爱人格测试的轻量级Web应用，提供用户测试、人格分析、匹配计算等功能。

## 1.2 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端 (Web/H5)                       │
├─────────────────────────────────────────────────────────────┤
│                           CDN                                │
│                      (静态资源加速)                          │
├─────────────────────────────────────────────────────────────┤
│                         Load Balancer                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Web API   │  │  Match API  │  │   Share/Stats API   │  │
│  │   (主服务)   │  │  (匹配服务)  │  │   (分享统计服务)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                        Redis Cache                           │
│                   (会话/结果缓存/限流)                        │
├─────────────────────────────────────────────────────────────┤
│                       MySQL Database                         │
│                   (用户/结果/统计数据)                        │
└─────────────────────────────────────────────────────────────┘
```

---

# 二、技术选型

## 2.1 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | React + TypeScript | 18.x | 组件化开发 |
| 前端路由 | React Router | 6.x | SPA路由 |
| 状态管理 | Zustand | 4.x | 轻量级状态 |
| HTTP Client | Axios | 1.x | API请求 |
| UI框架 | Tailwind CSS | 3.x | 样式方案 |
| 动画 | Framer Motion | 10.x | 交互动画 |
| 后端框架 | Node.js + Express | 18.x | API服务 |
| 数据库 | MySQL | 8.x | 主数据库 |
| 缓存 | Redis | 7.x | 会话/缓存 |
| 部署 | Docker | 24.x | 容器化 |
| CI/CD | GitHub Actions | - | 自动化部署 |

## 2.2 技术选型说明

- **前端React**：组件化、生态丰富，适合交互复杂的测试应用
- **Tailwind CSS**：快速开发响应式UI，减少样式管理成本
- **Zustand**：轻量级状态管理，无需像Redux那样配置繁琐
- **Node.js + Express**：前后端语言统一，开发效率高
- **Redis缓存**：测试结果可缓存，减少重复计算

---

# 三、数据库设计

## 3.1 数据库表结构

### 3.1.1 用户表（users）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AI | 用户ID |
| openid | VARCHAR(64) | UNIQUE | 微信openid |
| nickname | VARCHAR(64) | NULL | 昵称 |
| avatar_url | VARCHAR(255) | NULL | 头像URL |
| created_at | DATETIME | DEFAULT NOW() | 注册时间 |
| updated_at | DATETIME | ON UPDATE | 更新时间 |

### 3.1.2 测试结果表（test_results）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AI | 结果ID |
| user_id | BIGINT | FK → users.id | 用户ID |
| person_type | VARCHAR(32) | NOT NULL | 人格类型 |
| grade | ENUM('S','A','B','C','D') | NOT NULL | 等级 |
| dims | JSON | NOT NULL | 维度得分 |
| created_at | DATETIME | DEFAULT NOW() | 测试时间 |

### 3.1.3 匹配记录表（matches）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AI | 匹配ID |
| user_a_id | BIGINT | FK → users.id | 用户A |
| user_b_id | BIGINT | FK → users.id | 用户B |
| result_a_id | BIGINT | FK → test_results.id | A的结果 |
| result_b_id | BIGINT | FK → test_results.id | B的结果 |
| match_score | TINYINT | NOT NULL | 匹配度(0-100) |
| match_type | VARCHAR(32) | NOT NULL | 关系类型 |
| created_at | DATETIME | DEFAULT NOW() | 创建时间 |

### 3.1.4 分享记录表（shares）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AI | 分享ID |
| result_id | BIGINT | FK → test_results.id | 结果ID |
| platform | ENUM('wechat','moments','weibo','link') | 分享平台 |
| created_at | DATETIME | DEFAULT NOW() | 分享时间 |

### 3.1.5 题目表（questions）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK, AI | 题目ID |
| dimension | VARCHAR(16) | NOT NULL | 维度(S/E/A/R/C/F/M/L/X/D) |
| order_num | INT | NOT NULL | 题号(1-50) |
| content | TEXT | NOT NULL | 题目内容 |
| option_a | VARCHAR(255) | NOT NULL | A选项 |
| option_b | VARCHAR(255) | NOT NULL | B选项 |
| option_c | VARCHAR(255) | NOT NULL | C选项 |
| weight_a | TINYINT | DEFAULT 1 | A选项分值 |
| weight_b | TINYINT | DEFAULT 2 | B选项分值 |
| weight_c | TINYINT | DEFAULT 3 | C选项分值 |

> 说明：D维度（Q46-Q50）采用反向计分，建议在题库初始化时写入 `weight_a=3, weight_b=2, weight_c=1`。

### 3.1.6 人格类型表（person_types）

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | INT | PK, AI | 类型ID |
| code | VARCHAR(32) | UNIQUE | 类型编码 |
| name | VARCHAR(32) | NOT NULL | 类型名称 |
| name_en | VARCHAR(32) | NOT NULL | 英文名 |
| grade | ENUM('S','A','B','C','D') | NOT NULL | 等级 |
| tags | JSON | NOT NULL | 标签数组 |
| description | TEXT | NOT NULL | 描述 |
| advantages | JSON | NOT NULL | 优点数组 |
| disadvantages | JSON | NOT NULL | 缺点数组 |
| best_match | JSON | NOT NULL | 最适合类型 |
| worst_match | JSON | NOT NULL | 需避雷类型 |

---

## 3.2 ER图

```
┌─────────────┐       ┌─────────────┐
│    users    │       │questions   │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ openid      │       │ dimension   │
│ nickname    │       │ order_num   │
│ avatar_url  │       │ content     │
│ created_at  │       │ option_a/b/c │
└──────┬──────┘       │ weight_a/b/c│
       │              └─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐       ┌─────────────┐
│test_results │       │person_types │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ user_id (FK)│       │ code (UK)   │
│ person_type │       │ name        │
│ grade       │       │ grade       │
│ dims (JSON) │       │ description │
│ created_at  │       │ ...         │
└──────┬──────┘       └─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐       ┌─────────────┐
│   matches   │       │   shares    │
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ user_a_id   │       │ result_id   │
│ user_b_id   │       │ platform    │
│ result_a_id │       │ created_at  │
│ result_b_id │       └─────────────┘
│ match_score │
│ match_type  │
└─────────────┘
```

---

# 四、API设计

## 4.1 基础信息

| 项目 | 说明 |
|------|------|
| 基础URL | /api/v1 |
| 认证方式 | JWT Token |
| 数据格式 | JSON |
| 字符集 | UTF-8 |

## 4.2 公共响应格式

### 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    // 业务数据
  }
}
```

### 错误响应

```json
{
  "code": 400,
  "message": "错误描述",
  "error": {
    "type": "VALIDATION_ERROR",
    "details": []
  }
}
```

### 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 禁止访问 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 4.3 API接口

### 4.3.1 用户模块

#### 获取用户信息

```
GET /api/v1/user/profile

Headers:
  Authorization: Bearer <token>

Response:
{
  "code": 200,
  "data": {
    "id": 1001,
    "nickname": "小明",
    "avatar_url": "https://...",
    "test_count": 5,
    "created_at": "2026-04-01"
  }
}
```

#### 更新用户信息

```
PUT /api/v1/user/profile

Headers:
  Authorization: Bearer <token>

Body:
{
  "nickname": "新昵称",
  "avatar_url": "https://..."
}

Response:
{
  "code": 200,
  "data": {
    "id": 1001,
    "nickname": "新昵称"
  }
}
```

---

### 4.3.2 测试模块

#### 获取题目列表

```
GET /api/v1/quiz/questions

Query:
  dimension?: string  // 可选：筛选维度

Response:
{
  "code": 200,
  "data": {
    "total": 50,
    "questions": [
      {
        "id": 1,
        "dimension": "S",
        "order_num": 1,
        "content": "你通常如何评价自己？",
        "options": [
          {"key": "A", "content": "我觉得自己不够好"},
          {"key": "B", "content": "我觉得自己还行"},
          {"key": "C", "content": "我对自己很自信"}
        ]
      }
    ]
  }
}
```

#### 提交测试答案

```
POST /api/v1/quiz/submit

Headers:
  Authorization: Bearer <token>

Body:
{
  "answers": [
    {"question_id": 1, "answer": "A"},
    {"question_id": 2, "answer": "B"},
    // ... 共50条
  ]
}

Response:
{
  "code": 200,
  "data": {
    "result_id": 2001,
    "person_type": "LOVER",
    "grade": "S",
    "dims": {
      "S": 12,
      "E": 14,
      "A": 10,
      "R": 13,
      "C": 6,
      "F": 8,
      "M": 11,
      "L": 9,
      "X": 10,
      "D": 13
    },
    "tags": ["情绪价值爆炸", "无脑偏爱"],
    "short_desc": "你就是世界中心，甜到齁"
  }
}
```

#### 获取历史结果

```
GET /api/v1/quiz/results

Headers:
  Authorization: Bearer <token>

Query:
  page: number
  page_size: number

Response:
{
  "code": 200,
  "data": {
    "list": [
      {
        "id": 2001,
        "person_type": "LOVER",
        "grade": "S",
        "created_at": "2026-04-10"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 10
  }
}
```

---

### 4.3.3 匹配模块

#### 计算匹配度

```
POST /api/v1/match/calculate

Headers:
  Authorization: Bearer <token>

Body:
{
  "result_a_id": 2001,  // 自己的结果ID
  "result_b_id": 2002  // 对方的结果ID
}

Response:
{
  "code": 200,
  "data": {
    "match_id": 3001,
    "score": 87,
    "match_type": "灵魂伴侣",
    "type_description": "你们属于天选组合",
    "analysis": {
      "pros": [
        "你是情感价值顶配，他是安全感顶配",
        "你的热情他的金钱，绝佳互补"
      ],
      "risks": [
        "你可能会过于依赖，他可能过于理性"
      ],
      "suggestions": [
        "给彼此独立空间",
        "用情感回馈代替单纯物质索取"
      ]
    }
  }
}
```

#### 获取人格匹配详情

```
GET /api/v1/match/compatibility

Query:
  type_a: string   // LOVER
  type_b: string   // ATM-er

Response:
{
  "code": 200,
  "data": {
    "score": 90,
    "match_type": "极致宠爱",
    "description": "你是情感价值顶配，他是安全感顶配",
    "pros": ["情绪上头有人哄", "物质需求有人满足"],
    "cons": ["需要防止变成包养关系"],
    "tips": ["给彼此独立空间"]
  }
}
```

---

### 4.3.4 分享模块

#### 生成分享海报

```
POST /api/v1/share/generate

Headers:
  Authorization: Bearer <token>

Body:
{
  "result_id": 2001,
  "template": "default"  // 模板选择
}

Response:
{
  "code": 200,
  "data": {
    "poster_url": "https://cdn.example.com/posters/xxx.png",
    "share_link": "https://hearttype.app/r/xxx"
  }
}
```

#### 记录分享

```
POST /api/v1/share/record

Body:
{
  "result_id": 2001,
  "platform": "wechat"
}

Response:
{
  "code": 200,
  "data": {
    "share_id": 4001
  }
}
```

---

### 4.3.5 数据统计模块

#### 获取统计数据

```
GET /api/v1/stats/overview

Headers:
  Authorization: Bearer <token> (可选)

Query:
  days: number  // 默认7天

Response:
{
  "code": 200,
  "data": {
    "total_tests": 12580,
    "today_tests": 328,
    "total_matches": 5620,
    "today_shares": 156,
    "type_distribution": [
      {"type": "LOVER", "count": 2150, "percentage": 17.1},
      {"type": "ATM-er", "count": 1820, "percentage": 14.5},
      // ...
    ],
    "grade_distribution": [
      {"grade": "S", "count": 1200, "percentage": 9.5},
      {"grade": "A", "count": 3500, "percentage": 27.8},
      // ...
    ]
  }
}
```

#### 获取排行榜

```
GET /api/v1/stats/leaderboard

Query:
  type: "person_type" | "match_score"
  limit: number

Response:
{
  "code": 200,
  "data": {
    "rankings": [
      {"rank": 1, "type": "ATM-er", "count": 1820},
      {"rank": 2, "type": "LOVER", "count": 2150},
      // ...
    ]
  }
}
```

---

# 五、核心算法实现

## 5.1 维度得分计算

```typescript
interface Answer {
  question_id: number;
  answer: 'A' | 'B' | 'C';
}

interface DimensionScores {
  [key: string]: number; // 5-15
}

function calculateDimensionScores(answers: Answer[], questions: Question[]): DimensionScores {
  const dims = {
    S: 0, E: 0, A: 0, R: 0, C: 0, F: 0, M: 0, L: 0, X: 0, D: 0
  };

  answers.forEach(answer => {
    const question = questions.find(q => q.id === answer.question_id);
    if (!question) return;

    const weightMap = { A: question.weight_a, B: question.weight_b, C: question.weight_c };
    dims[question.dimension] += weightMap[answer.answer];
  });

  return dims;
}
```

## 5.2 等级转换

```typescript
type Level = 'L' | 'M' | 'H';

function convertToLevel(score: number): Level {
  if (score <= 8) return 'L';
  if (score <= 11) return 'M';
  return 'H';
}

function getDimensionLevels(dims: DimensionScores): Record<string, Level> {
  const levels: Record<string, Level> = {};
  for (const [dim, score] of Object.entries(dims)) {
    levels[dim] = convertToLevel(score);
  }
  return levels;
}
```

## 5.3 人格判定

```typescript
interface PersonTypeRule {
  code: string;
  conditions: Record<string, 'L' | 'M' | 'H' | '<M' | '>M' | '≤M' | '≥M'>;
  priority: number;
}

const RULES: PersonTypeRule[] = [
  // S级
  {
    code: 'ATM-er',
    conditions: { E: 'H', R: 'H', M: 'H', C: '≤M' },
    priority: 1
  },
  {
    code: 'LOVER',
    conditions: { E: 'H', D: 'H', F: '≤M' },
    priority: 2
  },
  {
    code: 'MUM',
    conditions: { R: 'H', F: 'H', E: '≥M' },
    priority: 3
  },
  {
    code: 'MALO',
    conditions: { L: 'H', X: 'H', M: '≤M' },
    priority: 4
  },
  // ... 其他规则
];

function determinePersonType(levels: Record<string, Level>): string {
  // 1. 先判断高风险人格
  const riskRules = RULES.filter(r =>
    ['SHIT', 'DEAD', 'FAKE', 'BOSS'].includes(r.code)
  );
  for (const rule of riskRules) {
    if (matchRule(rule.conditions, levels)) {
      return rule.code;
    }
  }

  // 2. 按优先级匹配
  const sortedRules = RULES.sort((a, b) => a.priority - b.priority);
  for (const rule of sortedRules) {
    if (matchRule(rule.conditions, levels)) {
      return rule.code;
    }
  }

  // 3. Fallback
  return 'NORMAL';
}

function matchRule(conditions: Record<string, any>, levels: Record<string, Level>): boolean {
  for (const [dim, expected] of Object.entries(conditions)) {
    const actual = levels[dim];
    if (!actual) continue;

    if (expected === actual) continue;
    if (expected === '≤M' && (actual === 'L' || actual === 'M')) continue;
    if (expected === '≥M' && (actual === 'M' || actual === 'H')) continue;
    if (expected === '<M' && actual === 'L') continue;
    if (expected === '>M' && actual === 'H') continue;

    return false;
  }
  return true;
}
```

## 5.4 匹配度计算

```typescript
interface Dims {
  S: number; E: number; A: number; R: number;
  C: number; F: number; M: number; L: number;
  X: number; D: number;
}

const DIM_WEIGHTS = {
  E: 1.5, R: 1.5, F: 1.3, C: 1.2, D: 1.2,
  S: 1.0, A: 1.0, M: 1.0, L: 1.0, X: 1.0
};

function calculateMatchScore(dimsA: Dims, dimsB: Dims): number {
  let totalWeight = 0;
  let weightedScore = 0;

  for (const dim of Object.keys(DIM_WEIGHTS)) {
    const diff = Math.abs(dimsA[dim] - dimsB[dim]);
    const similarity = 10 - diff; // 差值越小越好
    const weight = DIM_WEIGHTS[dim];

    weightedScore += similarity * weight;
    totalWeight += weight;
  }

  return Math.round((weightedScore / totalWeight) * 10);
}
```

## 5.5 人格化学反应

```typescript
interface ChemistryRule {
  typeA: string;
  typeB: string;
  score: number; // 加分或扣分
  description: string;
}

const CHEMISTRY_RULES: ChemistryRule[] = [
  // 高匹配
  { typeA: 'ATM-er', typeB: 'LOVER', score: 15, description: '极致宠爱' },
  { typeA: 'MUM', typeB: 'SOLO', score: 12, description: '治愈型' },
  { typeA: 'JOKE-R', typeB: 'MALO', score: 10, description: '快乐爆炸' },
  // 高风险
  { typeA: 'BOSS', typeB: 'LOVER', score: -20, description: '控制压迫' },
  { typeA: 'SHIT', typeB: 'ANY', score: -25, description: '毒性关系' },
  { typeA: 'FAKE', typeB: 'ANY', score: -20, description: '不真实' },
];

function applyChemistry(baseScore: number, typeA: string, typeB: string): number {
  let adjustment = 0;

  for (const rule of CHEMISTRY_RULES) {
    const isMatch = (rule.typeA === typeA && rule.typeB === typeB) ||
                    (rule.typeA === typeB && rule.typeB === typeA) ||
                    (rule.typeA === 'ANY' && rule.typeB === typeB) ||
                    (rule.typeB === 'ANY' && rule.typeA === typeA);
    if (isMatch) {
      adjustment += rule.score;
    }
  }

  return Math.max(0, Math.min(100, baseScore + adjustment));
}
```

---

# 六、缓存策略

## 6.1 Redis键设计

| 键名 | 类型 | 过期时间 | 说明 |
|------|------|----------|------|
| user:session:{userId} | String | 7天 | 用户会话 |
| quiz:questions | String | 24小时 | 题目缓存 |
| result:{resultId} | String | 30天 | 测试结果缓存 |
| match:{typeA}:{typeB} | String | 7天 | 人格匹配缓存 |
| stats:overview | String | 5分钟 | 统计数据缓存 |
| rate_limit:{ip} | String | 1分钟 | 限流计数器 |

## 6.2 缓存策略

| 数据类型 | 缓存策略 | 说明 |
|----------|----------|------|
| 题目数据 | Cache-Aside | 启动时加载，缓存24h |
| 用户会话 | Write-Through | 写入DB同时更新Redis |
| 测试结果 | Cache-Aside | 计算后缓存30天 |
| 匹配计算 | Write-Through | 计算后缓存结果 |
| 统计数据 | TTL + 定时刷新 | 5分钟过期，后台异步更新 |

---

# 七、安全设计

## 7.1 认证授权

```typescript
// JWT Token 载荷
interface TokenPayload {
  userId: number;
  openid: string;
  exp: number; // 过期时间戳
}

// 生成Token
function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '7d'
  });
}

// 验证Token
function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
}
```

## 7.2 接口限流

```typescript
// 基于IP的限流
const RATE_LIMIT = {
  // 同一个IP每分钟最多请求次数
  default: 60,
  // 提交答案每分钟最多10次
  submit: 10,
  // 匹配计算每分钟20次
  match: 20
};
```

## 7.3 数据校验

- 所有用户输入进行参数校验
- 答案数组必须正好50条
- D维度题目按反向分值写入题库（Q46-Q50：A=3, B=2, C=1）
- 人格类型必须为有效枚举值
- 匹配度分数clamp到0-100

---

# 八、部署架构

## 8.1 Docker配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: ./web
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - API_URL=http://api:3001
    depends_on:
      - api
    networks:
      - hearttype

  api:
    build: ./api
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis
    networks:
      - hearttype

  mysql:
    image: mysql:8.0
    volumes:
      - mysql_data:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=xxx
      - MYSQL_DATABASE=hearttype
    networks:
      - hearttype

  redis:
    image: redis:7-alpine
    networks:
      - hearttype

volumes:
  mysql_data:

networks:
  hearttype:
    driver: bridge
```

## 8.2 目录结构

```
hearttype/
├── web/                    # 前端项目
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/         # 页面
│   │   ├── hooks/         # 自定义Hook
│   │   ├── services/      # API服务
│   │   ├── store/         # Zustand状态
│   │   └── utils/         # 工具函数
│   ├── public/
│   ├── package.json
│   └── Dockerfile
│
├── api/                    # 后端项目
│   ├── src/
│   │   ├── controllers/   # 控制器
│   │   ├── services/      # 业务逻辑
│   │   ├── models/        # 数据模型
│   │   ├── middleware/    # 中间件
│   │   ├── utils/         # 工具函数
│   │   └── index.ts       # 入口
│   ├── package.json
│   └── Dockerfile
│
├── scripts/               # 部署脚本
├── docker-compose.yml     # 容器编排
└── README.md
```

---

# 九、一句话总结

> HeartType技术方案 = **React+Node全栈 + MySQL持久化 + Redis缓存 + JWT认证 + Docker部署**

---

*文档版本：v1.0*
*更新时间：2026-04-10*
