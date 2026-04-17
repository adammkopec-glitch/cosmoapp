// filepath: apps/server/src/app.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { errorMiddleware } from './middleware/error.middleware';

// Routes
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import servicesRouter from './modules/services/services.router';
import blogRouter from './modules/blog/blog.router';
import metamorphosesRouter from './modules/metamorphoses/metamorphoses.router';
import loyaltyRouter from './modules/loyalty/loyalty.router';
import appointmentsRouter from './modules/appointments/appointments.router';
import chatRouter from './modules/chat/chat.router';
import employeesRouter from './modules/employees/employees.router';
import heroRouter from './modules/hero/hero.router';
import discountCodesRouter from './modules/discount-codes/discount-codes.router';
import termsRouter from './modules/terms/terms.router';
import aboutRouter from './modules/about/about.router';
import pushRouter from './modules/push/push.router';
import consultationsRouter from './modules/consultations/consultations.router';
import quizRouter from './modules/quiz/quiz.router';
import reviewsRouter from './modules/reviews/reviews.router';
import remindersRouter from './modules/reminders/reminders.router';
import achievementsRouter from './modules/achievements/achievements.router';
import notificationsRouter from './modules/notifications/notifications.router';
import skinJournalRouter from './modules/skin-journal/skin-journal.router';
import productsRouter from './modules/products/products.router';
import homecareRouter from './modules/homecare/homecare.router';
import blogCommentsRouter from './modules/blog-comments/blog-comments.router';
import happyHoursRouter from './modules/happy-hours/happy-hours.router';
import recommendedSlidesRouter from './modules/recommended-slides/router';
import skinWeatherRouter from './modules/skin-weather/skin-weather.router';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(pinoHttp());

// Static files for uploads if needed
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/services', servicesRouter);
app.use('/api/blog', blogRouter);
app.use('/api/metamorphoses', metamorphosesRouter);
app.use('/api/loyalty', loyaltyRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/hero', heroRouter);
app.use('/api/discount-codes', discountCodesRouter);
app.use('/api/terms', termsRouter);
app.use('/api/about', aboutRouter);
app.use('/api/push', pushRouter);
app.use('/api/consultations', consultationsRouter);
app.use('/api/quizzes', quizRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/achievements', achievementsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/skin-journal', skinJournalRouter);
app.use('/api/products', productsRouter);
app.use('/api/homecare', homecareRouter);
app.use('/api/blog-comments', blogCommentsRouter);
app.use('/api/happy-hours', happyHoursRouter);
app.use('/api/recommended-slides', recommendedSlidesRouter);
app.use('/api/skin-weather', skinWeatherRouter);

// 404 handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    status: 'error',
    message: `Nie znaleziono ścieżki: ${req.originalUrl}`
  });
});

// Global Error Handler
app.use(errorMiddleware);

export default app;
