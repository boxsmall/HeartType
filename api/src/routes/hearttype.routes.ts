import { Router } from 'express';
import { submitQuiz } from '../controllers/quiz.controller';
import { calculateCompatibility, calculateMatch } from '../controllers/match.controller';

const router = Router();

router.post('/quiz/submit', submitQuiz);
router.post('/match/calculate', calculateMatch);
router.post('/match/compatibility', calculateCompatibility);

export default router;
