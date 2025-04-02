"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeUserLanguage = exports.updateLanguageLevel = exports.getUserLanguages = exports.addUserLanguage = exports.getAllLanguages = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllLanguages = async (_req, res) => {
    try {
        const languages = await prisma.language.findMany();
        res.json({
            success: true,
            data: languages
        });
    }
    catch (error) {
        console.error('Error fetching languages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching languages'
        });
    }
};
exports.getAllLanguages = getAllLanguages;
const addUserLanguage = async (req, res) => {
    try {
        const { name, code, level } = req.body;
        const userId = req.user.id;
        let language = await prisma.language.findUnique({
            where: { code }
        });
        if (!language) {
            language = await prisma.language.create({
                data: {
                    name,
                    code
                }
            });
        }
        const existingUserLanguage = await prisma.userLanguage.findUnique({
            where: {
                userId_languageId: {
                    userId,
                    languageId: language.id
                }
            }
        });
        if (existingUserLanguage) {
            res.status(400).json({
                success: false,
                message: 'Language already added to your learning list'
            });
            return;
        }
        const userLanguage = await prisma.userLanguage.create({
            data: {
                userId,
                languageId: language.id,
                level: level || 'BEGINNER'
            },
            include: {
                language: true
            }
        });
        res.status(201).json({
            success: true,
            message: 'Language added to learning list',
            data: userLanguage
        });
    }
    catch (error) {
        console.error('Error adding user language:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding language to learning list'
        });
    }
};
exports.addUserLanguage = addUserLanguage;
const getUserLanguages = async (req, res) => {
    try {
        const userId = req.user.id;
        const userLanguages = await prisma.userLanguage.findMany({
            where: { userId },
            include: {
                language: true
            }
        });
        res.json({
            success: true,
            data: userLanguages
        });
    }
    catch (error) {
        console.error('Error fetching user languages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user languages'
        });
    }
};
exports.getUserLanguages = getUserLanguages;
const updateLanguageLevel = async (req, res) => {
    try {
        const { languageId, level } = req.body;
        const userId = req.user.id;
        const userLanguage = await prisma.userLanguage.update({
            where: {
                userId_languageId: {
                    userId,
                    languageId
                }
            },
            data: { level },
            include: {
                language: true
            }
        });
        res.json({
            success: true,
            message: 'Language level updated',
            data: userLanguage
        });
    }
    catch (error) {
        console.error('Error updating language level:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating language level'
        });
    }
};
exports.updateLanguageLevel = updateLanguageLevel;
const removeUserLanguage = async (req, res) => {
    try {
        const { languageId } = req.params;
        const userId = req.user.id;
        await prisma.userLanguage.delete({
            where: {
                userId_languageId: {
                    userId,
                    languageId
                }
            }
        });
        res.json({
            success: true,
            message: 'Language removed from learning list'
        });
    }
    catch (error) {
        console.error('Error removing user language:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing language from learning list'
        });
    }
};
exports.removeUserLanguage = removeUserLanguage;
//# sourceMappingURL=language.controllers.js.map