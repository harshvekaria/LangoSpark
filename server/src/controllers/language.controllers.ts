import { Request, Response } from 'express';
import { PrismaClient, Level } from '@prisma/client';

const prisma = new PrismaClient();

interface TypedRequestBody<T> extends Request {
    body: T;
    user: {
        id: string;
    };
}

interface AddLanguageBody {
    languageId: string;
    level: Level;
}

interface UpdateLevelBody {
    languageId: string;
    level: Level;
}

// Get all available languages
export const getAllLanguages = async (_req: Request, res: Response): Promise<void> => {
    try {
        const languages = await prisma.language.findMany();
        res.json({
            success: true,
            data: languages
        });
    } catch (error) {
        console.error('Error fetching languages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching languages'
        });
    }
};

// Add a language to user's learning list
export const addUserLanguage = async (
    req: TypedRequestBody<AddLanguageBody>,
    res: Response
): Promise<void> => {
    try {
        const { languageId, level } = req.body;
        const userId = req.user.id;

        // Check if language exists
        const language = await prisma.language.findUnique({
            where: { id: languageId }
        });

        if (!language) {
            res.status(404).json({
                success: false,
                message: 'Language not found'
            });
            return;
        }

        // Add language to user's list
        const userLanguage = await prisma.userLanguage.create({
            data: {
                userId,
                languageId,
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
    } catch (error) {
        console.error('Error adding user language:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding language to learning list'
        });
    }
};

// Get user's learning languages
export const getUserLanguages = async (req: TypedRequestBody<{}>, res: Response): Promise<void> => {
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
    } catch (error) {
        console.error('Error fetching user languages:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching learning languages'
        });
    }
};

// Update user's language level
export const updateLanguageLevel = async (
    req: TypedRequestBody<UpdateLevelBody>,
    res: Response
): Promise<void> => {
    try {
        const { languageId, level } = req.body;
        const userId = req.user.id;

        const updatedUserLanguage = await prisma.userLanguage.update({
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
            data: updatedUserLanguage
        });
    } catch (error) {
        console.error('Error updating language level:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating language level'
        });
    }
};

// Remove a language from user's learning list
export const removeUserLanguage = async (
    req: TypedRequestBody<{}> & { params: { languageId: string } },
    res: Response
): Promise<void> => {
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
    } catch (error) {
        console.error('Error removing user language:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing language from learning list'
        });
    }
}; 