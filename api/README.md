# HeartType API (Demo Scaffold)

## Quick Start

```bash
cd api
npm install
npm run dev
```

Server default: `http://localhost:3001`

## Endpoints

- `GET /health`
- `POST /api/v1/quiz/submit`
- `POST /api/v1/match/calculate`

## Demo flow

1. Submit quiz answers to get `result_id`
2. Submit another quiz answers to get second `result_id`
3. Call match API with `result_a_id` and `result_b_id`

