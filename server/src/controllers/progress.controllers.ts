import { Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface TypedRequestBody<T> extends Request {
    body: T;
    user: {
        id: string;
    };
}

interface UpdateProgressBody {
    lessonId: string;
    score: number;
    completed: boolean;
}

type UserLanguageWithProgress = Prisma.UserLanguageGetPayload<{
    include: {
        language: true;
        user: {
            select: {
                learningProgress: {
                    include: {
                        lesson: true;
                    };
                };
            };
        };
    };
}>;

// Get user's learning progress dashboard
export const getProgressDashboard = async (req: TypedRequestBody<{}>, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;

        // Get user's languages with progress
        const userProgress = await prisma.userLanguage.findMany({
            where: { userId },
            include: {
                language: true,
                user: {
                    select: {
                        learningProgress: {
                            include: {
                                lesson: true
                            }
                        }
                    }
                }
            }
        });

        // Calculate statistics for each language
        const progressStats = userProgress.map((lang: UserLanguageWithProgress) => {
            const lessonProgress = lang.user.learningProgress.filter(
                progress => progress.lesson.languageId === lang.languageId
            );

            const totalLessons = lessonProgress.length;
            const completedLessons = lessonProgress.filter(p => p.completed).length;
            const averageScore = totalLessons > 0
                ? lessonProgress.reduce((sum: number, p) => sum + p.score, 0) / totalLessons
                : 0;

            return {
                language: lang.language,
                level: lang.level,
                progress: {
                    totalLessons,
                    completedLessons,
                    completionRate: totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0,
                    averageScore
                }
            };
        });

        res.json({
            success: true,
            data: progressStats
        });
    } catch (error) {
        console.error('Error fetching progress dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching progress dashboard'
        });
    }
};

// Update lesson progress
export const updateLessonProgress = async (
    req: TypedRequestBody<UpdateProgressBody>,
    res: Response
): Promise<void> => {
    try {
        const { lessonId, score, completed } = req.body;
        const userId = req.user.id;

        // Check if lesson exists
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId }
        });

        if (!lesson) {
            res.status(404).json({
                success: false,
                message: 'Lesson not found'
            });
            return;
        }

        // Update or create progress
        const progress = await prisma.learningProgress.upsert({
            where: {
                userId_lessonId: {
                    userId,
                    lessonId
                }
            },
            update: {
                score,
                completed
            },
            create: {
                userId,
                lessonId,
                score,
                completed
            },
            include: {
                lesson: true
            }
        });

        res.json({
            success: true,
            message: 'Progress updated successfully',
            data: progress
        });
    } catch (error) {
        console.error('Error updating lesson progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating lesson progress'
        });
    }
};

// Get detailed progress for a specific language
export const getLanguageProgress = async (
    req: TypedRequestBody<{}> & { params: { languageId: string } },
    res: Response
): Promise<void> => {
    try {
        const { languageId } = req.params;
        const userId = req.user.id;

        // Get all lessons and progress for the language
        const progress = await prisma.lesson.findMany({
            where: {
                language: {
                    id: languageId
                }
            },
            include: {
                progress: {
                    where: {
                        userId
                    }
                }
            }
        });

        const progressDetails = progress.map(lesson => ({
            lesson: {
                id: lesson.id,
                title: lesson.title,
                level: lesson.level,
                description: lesson.description
            },
            progress: lesson.progress[0] || {
                completed: false,
                score: 0
            }
        }));

        res.json({
            success: true,
            data: progressDetails
        });
    } catch (error) {
        console.error('Error fetching language progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching language progress'
        });
    }
}; 