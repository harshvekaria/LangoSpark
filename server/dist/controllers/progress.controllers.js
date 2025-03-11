"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLanguageProgress = exports.updateLessonProgress = exports.getProgressDashboard = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getProgressDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
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
        const progressStats = userProgress.map((lang) => {
            const lessonProgress = lang.user.learningProgress.filter(progress => progress.lesson.languageId === lang.languageId);
            const totalLessons = lessonProgress.length;
            const completedLessons = lessonProgress.filter(p => p.completed).length;
            const averageScore = totalLessons > 0
                ? lessonProgress.reduce((sum, p) => sum + p.score, 0) / totalLessons
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
    }
    catch (error) {
        console.error('Error fetching progress dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching progress dashboard'
        });
    }
};
exports.getProgressDashboard = getProgressDashboard;
const updateLessonProgress = async (req, res) => {
    try {
        const { lessonId, score, completed } = req.body;
        const userId = req.user.id;
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
    }
    catch (error) {
        console.error('Error updating lesson progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating lesson progress'
        });
    }
};
exports.updateLessonProgress = updateLessonProgress;
const getLanguageProgress = async (req, res) => {
    try {
        const { languageId } = req.params;
        const userId = req.user.id;
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
    }
    catch (error) {
        console.error('Error fetching language progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching language progress'
        });
    }
};
exports.getLanguageProgress = getLanguageProgress;
//# sourceMappingURL=progress.controllers.js.map