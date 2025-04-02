import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Anthropic } from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

interface LessonRequest {
    languageId: string;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    topic?: string;
}

interface QuizRequest {
    lessonId: string;
    numberOfQuestions?: number;
}

/**
 * Generate a language lesson using Claude AI
 */
export const generateLesson = async (req: Request, res: Response) => {
    try {
        const { languageId, level, topic } = req.body as LessonRequest;

        // Get language details
        const language = await prisma.language.findUnique({
            where: { id: languageId }
        });

        if (!language) {
            return res.status(404).json({ message: 'Language not found' });
        }

        // Generate lesson content using Claude
        const message = await anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 1000,
            messages: [{
                role: 'user',
                content: `Generate a structured ${level.toLowerCase()} level lesson for learning ${language.name}${topic ? ` about ${topic}` : ''}. 
                Include:
                1. Vocabulary section with 5-10 key words/phrases
                2. Grammar explanation
                3. Example sentences
                4. Practice exercises
                5. Cultural notes (if relevant)
                
                IMPORTANT: Format your response as a valid JSON object with these exact keys:
                {
                    "vocabulary": [{"word": "", "translation": "", "example": ""}],
                    "grammar": "",
                    "examples": [],
                    "exercises": [],
                    "culturalNotes": ""
                }`
            }]
        });

        // Parse the AI response
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        let lessonContent;
        try {
            lessonContent = JSON.parse(responseText);
        } catch (error) {
            // If parsing fails, try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                lessonContent = JSON.parse(jsonMatch[0]);
            } else {
                // If no JSON found, create a structured response from the text
                lessonContent = {
                    vocabulary: [],
                    grammar: responseText,
                    examples: [],
                    exercises: [],
                    culturalNotes: ""
                };
            }
        }

        // Save lesson to database
        const lesson = await prisma.lesson.create({
            data: {
                title: topic || `${level} ${language.name} Lesson`,
                description: 'AI-generated lesson',
                languageId,
                level,
            }
        });

        // Create quiz for the lesson
        await generateQuizInternal(lesson.id, lessonContent);

        return res.json({
            success: true,
            lesson: {
                ...lesson,
                content: lessonContent
            }
        });
    } catch (error) {
        console.error('Error generating lesson:', error);
        return res.status(500).json({ message: 'Error generating lesson' });
    }
};

/**
 * Generate MCQ quiz for a lesson using Claude AI
 */
export const generateQuiz = async (req: Request, res: Response) => {
    try {
        const { lessonId, numberOfQuestions = 5 } = req.body as QuizRequest;

        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: { language: true }
        });

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found' });
        }

        const quiz = await generateQuizInternal(lessonId, null, numberOfQuestions);
        return res.json({ success: true, quiz });
    } catch (error) {
        console.error('Error generating quiz:', error);
        return res.status(500).json({ message: 'Error generating quiz' });
    }
};

/**
 * Internal function to generate quiz
 */
async function generateQuizInternal(lessonId: string, lessonContent: any = null, numberOfQuestions: number = 5) {
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { language: true }
    });

    if (!lesson) throw new Error('Lesson not found');

    const message = await anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        messages: [{
            role: 'user',
            content: `Generate ${numberOfQuestions} multiple-choice questions for a ${lesson.level.toLowerCase()} level ${lesson.language.name} lesson${lessonContent ? ' based on this content: ' + JSON.stringify(lessonContent) : ''}. 
            IMPORTANT: Format your response as a valid JSON array of objects with these exact keys:
            [
                {
                    "question": "",
                    "options": [],
                    "correctAnswer": 0,
                    "explanation": ""
                }
            ]`
        }]
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    let quizContent;
    try {
        quizContent = JSON.parse(responseText);
    } catch (error) {
        // If parsing fails, try to extract JSON from the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            quizContent = JSON.parse(jsonMatch[0]);
        } else {
            quizContent = [];
        }
    }

    // Save quiz to database
    return await prisma.quiz.create({
        data: {
            lessonId,
            questions: quizContent
        }
    });
}

/**
 * Generate conversation practice prompts
 */
export const generateConversationPrompt = async (req: Request, res: Response) => {
    try {
        const { languageId, level, scenario } = req.body;
        const userId = (req as any).user.id;

        const language = await prisma.language.findUnique({
            where: { id: languageId }
        });

        if (!language) {
            return res.status(404).json({ message: 'Language not found' });
        }

        const message = await anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 1000,
            messages: [{
                role: 'user',
                content: `Generate a realistic conversation scenario in ${language.name} for ${level.toLowerCase()} level${scenario ? ` about ${scenario}` : ''}. 
                IMPORTANT: Format your response as a valid JSON object with these exact keys:
                {
                    "context": "",
                    "vocabulary": [{"word": "", "translation": ""}],
                    "script": [{"french": "", "english": ""}],
                    "culturalNotes": ""
                }`
            }]
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        let conversationContent;
        try {
            conversationContent = JSON.parse(responseText);
        } catch (error) {
            // If parsing fails, try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                conversationContent = JSON.parse(jsonMatch[0]);
            } else {
                conversationContent = {
                    context: responseText,
                    vocabulary: [],
                    script: [],
                    culturalNotes: ""
                };
            }
        }

        // Save conversation practice
        await prisma.conversationPractice.create({
            data: {
                userId,
                transcript: conversationContent
            }
        });

        return res.json({
            success: true,
            conversation: conversationContent
        });
    } catch (error) {
        console.error('Error generating conversation:', error);
        return res.status(500).json({ message: 'Error generating conversation prompt' });
    }
};

/**
 * Get pronunciation feedback using Claude AI
 */
export const getPronunciationFeedback = async (req: Request, res: Response) => {
    try {
        const { languageId, audioTranscript, targetSentence } = req.body;
        const userId = (req as any).user.id;

        const language = await prisma.language.findUnique({
            where: { id: languageId }
        });

        if (!language) {
            return res.status(404).json({ message: 'Language not found' });
        }

        const message = await anthropic.messages.create({
            model: 'claude-3-opus-20240229',
            max_tokens: 500,
            messages: [{
                role: 'user',
                content: `Compare this transcribed pronunciation "${audioTranscript}" with the target sentence "${targetSentence}" in ${language.name}.
                IMPORTANT: Format your response as a valid JSON object with these exact keys:
                {
                    "accuracy": 0.0,
                    "feedback": "",
                    "suggestions": []
                }`
            }]
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        let feedback;
        try {
            feedback = JSON.parse(responseText);
        } catch (error) {
            // If parsing fails, try to extract JSON from the response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                feedback = JSON.parse(jsonMatch[0]);
            } else {
                feedback = {
                    accuracy: 0,
                    feedback: responseText,
                    suggestions: []
                };
            }
        }

        // Save pronunciation feedback
        await prisma.pronunciationFeedback.create({
            data: {
                userId,
                sentence: targetSentence,
                accuracy: feedback.accuracy || 0,
                feedback: feedback.feedback || ''
            }
        });

        return res.json({
            success: true,
            feedback
        });
    } catch (error) {
        console.error('Error generating pronunciation feedback:', error);
        return res.status(500).json({ message: 'Error generating pronunciation feedback' });
    }
}; 