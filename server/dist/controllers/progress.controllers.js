"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateQuizProgress = exports.getLanguageProgress = exports.updateLessonProgress = exports.getProgressDashboard = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getProgressDashboard = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`Fetching dashboard data for user: ${userId}`);
        const progressRecords = await prisma.learningProgress.findMany({
            where: { userId },
            include: {
                lesson: {
                    include: {
                        language: true
                    }
                }
            }
        });
        console.log(`Found ${progressRecords.length} learning progress records for user ${userId}`);
        if (progressRecords.length === 0) {
            const userLanguages = await prisma.userLanguage.findMany({
                where: { userId },
                include: {
                    language: true
                }
            });
            if (!userLanguages.length) {
                console.log('No languages found for user');
                return res.json({
                    success: true,
                    data: []
                });
            }
            const emptyProgressResults = userLanguages.map(userLang => ({
                language: {
                    id: userLang.language.id,
                    name: userLang.language.name
                },
                level: userLang.level,
                progress: {
                    totalLessons: 0,
                    completedLessons: 0,
                    completionRate: 0,
                    averageScore: 0
                }
            }));
            console.log(`Sending ${emptyProgressResults.length} empty language progress records`);
            return res.json({
                success: true,
                data: emptyProgressResults
            });
        }
        const progressByLanguage = new Map();
        for (const record of progressRecords) {
            const languageId = record.lesson.languageId;
            const language = record.lesson.language;
            if (!progressByLanguage.has(languageId)) {
                progressByLanguage.set(languageId, {
                    language: {
                        id: languageId,
                        name: language.name
                    },
                    level: null,
                    records: [],
                    lessonIds: new Set()
                });
            }
            const languageData = progressByLanguage.get(languageId);
            languageData.records.push(record);
            languageData.lessonIds.add(record.lessonId);
        }
        const progressResults = [];
        for (const [languageId, languageData] of progressByLanguage.entries()) {
            try {
                const userLanguage = await prisma.userLanguage.findUnique({
                    where: {
                        userId_languageId: {
                            userId,
                            languageId
                        }
                    }
                });
                languageData.level = (userLanguage === null || userLanguage === void 0 ? void 0 : userLanguage.level) || 'BEGINNER';
                const totalLessonsCount = await prisma.lesson.count({
                    where: { languageId }
                });
                const completedRecords = languageData.records.filter((r) => r.completed === true);
                const completedLessons = completedRecords.length;
                const totalScore = completedRecords.reduce((sum, record) => {
                    return sum + (typeof record.score === 'number' ? record.score : 0);
                }, 0);
                const averageScore = completedLessons > 0
                    ? Math.round(totalScore / completedLessons)
                    : 0;
                const completionRate = totalLessonsCount > 0
                    ? Math.round((completedLessons / totalLessonsCount) * 100)
                    : 0;
                console.log(`Language: ${languageData.language.name}, ` +
                    `Completed: ${completedLessons}/${totalLessonsCount}, ` +
                    `Rate: ${completionRate}%, Avg Score: ${averageScore}`);
                progressResults.push({
                    language: languageData.language,
                    level: languageData.level,
                    progress: {
                        totalLessons: totalLessonsCount,
                        completedLessons,
                        completionRate,
                        averageScore
                    }
                });
            }
            catch (langError) {
                console.error(`Error processing language ${languageData.language.name}:`, langError);
            }
        }
        const allUserLanguages = await prisma.userLanguage.findMany({
            where: { userId },
            include: { language: true }
        });
        for (const userLang of allUserLanguages) {
            if (!progressByLanguage.has(userLang.languageId)) {
                console.log(`Adding language with no progress: ${userLang.language.name}`);
                progressResults.push({
                    language: {
                        id: userLang.language.id,
                        name: userLang.language.name
                    },
                    level: userLang.level,
                    progress: {
                        totalLessons: 0,
                        completedLessons: 0,
                        completionRate: 0,
                        averageScore: 0
                    }
                });
            }
        }
        console.log(`Sending ${progressResults.length} language progress records`);
        res.json({
            success: true,
            data: progressResults
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
        console.log(`Updating progress for user ${userId}, lesson ${lessonId}`);
        console.log(`Score: ${score}, Completed: ${completed}`);
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                language: true
            }
        });
        if (!lesson) {
            console.log(`Lesson not found: ${lessonId}`);
            res.status(404).json({
                success: false,
                message: 'Lesson not found'
            });
            return;
        }
        console.log(`Lesson found: ${lesson.title}, Language: ${lesson.language.name}`);
        const validatedScore = typeof score === 'number' && score >= 0 && score <= 100
            ? Math.round(score)
            : 0;
        const progress = await prisma.learningProgress.upsert({
            where: {
                userId_lessonId: {
                    userId,
                    lessonId
                }
            },
            update: {
                score: validatedScore,
                completed: !!completed,
                updatedAt: new Date()
            },
            create: {
                userId,
                lessonId,
                score: validatedScore,
                completed: !!completed
            },
            include: {
                lesson: {
                    include: {
                        language: true
                    }
                }
            }
        });
        console.log(`Progress updated successfully for lesson "${progress.lesson.title}"`);
        console.log(`New progress: Score ${progress.score}, Completed: ${progress.completed}`);
        const responseData = Object.assign(Object.assign({}, progress), { language: progress.lesson.language });
        res.json({
            success: true,
            message: 'Progress updated successfully',
            data: responseData
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
        console.log(`Fetching progress for language ${languageId}, user ${userId}`);
        const language = await prisma.language.findUnique({
            where: { id: languageId }
        });
        if (!language) {
            console.log(`Language not found: ${languageId}`);
            return res.status(404).json({
                success: false,
                message: 'Language not found'
            });
        }
        console.log(`Fetching progress for language: ${language.name}`);
        const lessons = await prisma.lesson.findMany({
            where: { languageId },
            orderBy: { createdAt: 'asc' }
        });
        if (!lessons.length) {
            console.log(`No lessons found for language: ${languageId}`);
            return res.json({
                success: true,
                data: []
            });
        }
        console.log(`Found ${lessons.length} lessons for language ${languageId}`);
        const progressRecords = await prisma.learningProgress.findMany({
            where: {
                userId,
                lesson: {
                    languageId
                }
            },
            include: {
                lesson: true
            }
        });
        console.log(`Found ${progressRecords.length} progress records for language ${languageId}`);
        const progressByLessonId = {};
        for (const record of progressRecords) {
            progressByLessonId[record.lessonId] = {
                completed: record.completed,
                score: record.score,
                updatedAt: record.updatedAt
            };
        }
        const progressDetails = lessons.map(lesson => {
            const progress = progressByLessonId[lesson.id] || {
                completed: false,
                score: 0,
                updatedAt: null
            };
            return {
                lesson: {
                    id: lesson.id,
                    title: lesson.title,
                    level: lesson.level,
                    description: lesson.description,
                    createdAt: lesson.createdAt
                },
                progress
            };
        });
        progressDetails.sort((a, b) => {
            if (a.progress.completed !== b.progress.completed) {
                return a.progress.completed ? 1 : -1;
            }
            if (a.progress.completed && b.progress.completed) {
                return new Date(b.progress.updatedAt || 0).getTime() -
                    new Date(a.progress.updatedAt || 0).getTime();
            }
            return new Date(a.lesson.createdAt || 0).getTime() -
                new Date(b.lesson.createdAt || 0).getTime();
        });
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
const updateQuizProgress = async (req, res) => {
    try {
        const { quizId, score, timeTaken } = req.body;
        const userId = req.user.id;
        console.log(`Updating quiz progress for user ${userId}, quiz ${quizId}`);
        console.log(`Score: ${score}, Time taken: ${timeTaken || 'N/A'}`);
        const quiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                lesson: {
                    include: {
                        language: true
                    }
                }
            }
        });
        if (!quiz) {
            console.log(`Quiz not found: ${quizId}`);
            res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
            return;
        }
        const lessonId = quiz.lessonId;
        console.log(`Quiz found. Associated lesson: ${quiz.lesson.title}, Language: ${quiz.lesson.language.name}`);
        const validatedScore = typeof score === 'number' && score >= 0 && score <= 100
            ? Math.round(score)
            : 0;
        const progress = await prisma.learningProgress.upsert({
            where: {
                userId_lessonId: {
                    userId,
                    lessonId
                }
            },
            update: {
                score: validatedScore,
                completed: true,
                updatedAt: new Date()
            },
            create: {
                userId,
                lessonId,
                score: validatedScore,
                completed: true
            }
        });
        console.log(`Progress updated successfully: Score ${progress.score}, Completed: ${progress.completed}`);
        let leaderboardEntry = null;
        try {
            leaderboardEntry = await prisma.leaderboardEntry.upsert({
                where: {
                    userId_quizId: {
                        userId,
                        quizId
                    }
                },
                update: {
                    score: validatedScore,
                    timeTaken: timeTaken !== null && timeTaken !== void 0 ? timeTaken : undefined
                },
                create: {
                    userId,
                    quizId,
                    score: validatedScore,
                    timeTaken: timeTaken !== null && timeTaken !== void 0 ? timeTaken : undefined
                }
            });
            console.log(`Leaderboard entry created/updated: Score ${leaderboardEntry.score}`);
        }
        catch (e) {
            console.error('Leaderboard entry failed, schema might not be migrated yet:', e);
        }
        res.json({
            success: true,
            message: 'Quiz progress updated successfully',
            data: {
                progress: {
                    lessonId: progress.lessonId,
                    score: progress.score,
                    completed: progress.completed
                },
                leaderboard: leaderboardEntry ? {
                    quizId: leaderboardEntry.quizId,
                    score: leaderboardEntry.score,
                    timeTaken: leaderboardEntry.timeTaken
                } : null
            }
        });
    }
    catch (error) {
        console.error('Error updating quiz progress:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating quiz progress'
        });
    }
};
exports.updateQuizProgress = updateQuizProgress;
//# sourceMappingURL=progress.controllers.js.map