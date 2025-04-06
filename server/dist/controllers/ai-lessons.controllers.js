"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLessonContent = exports.getPronunciationFeedback = exports.generateConversationPrompt = exports.generateQuiz = exports.generateLesson = void 0;
const client_1 = require("@prisma/client");
const sdk_1 = require("@anthropic-ai/sdk");
const prisma = new client_1.PrismaClient();
const anthropic = new sdk_1.Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});
const generateLesson = async (req, res) => {
    try {
        const { languageId, level, topic } = req.body;
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
        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        let lessonContent;
        try {
            lessonContent = JSON.parse(responseText);
        }
        catch (error) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                lessonContent = JSON.parse(jsonMatch[0]);
            }
            else {
                lessonContent = {
                    vocabulary: [],
                    grammar: responseText,
                    examples: [],
                    exercises: [],
                    culturalNotes: ""
                };
            }
        }
        const lesson = await prisma.lesson.create({
            data: {
                title: topic || `${level} ${language.name} Lesson`,
                description: 'AI-generated lesson',
                languageId,
                level,
                content: lessonContent
            }
        });
        await generateQuizInternal(lesson.id, lessonContent);
        return res.json({
            success: true,
            lesson: Object.assign(Object.assign({}, lesson), { content: lessonContent })
        });
    }
    catch (error) {
        console.error('Error generating lesson:', error);
        return res.status(500).json({ message: 'Error generating lesson' });
    }
};
exports.generateLesson = generateLesson;
const generateQuiz = async (req, res) => {
    try {
        const { lessonId, numberOfQuestions = 5 } = req.body;
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                language: true,
                Quiz: true
            }
        });
        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found'
            });
        }
        if (lesson.Quiz && lesson.Quiz.length > 0) {
            return res.json({
                success: true,
                quiz: lesson.Quiz[0]
            });
        }
        const quiz = await generateQuizInternal(lessonId, lesson.content, numberOfQuestions);
        return res.json({
            success: true,
            quiz
        });
    }
    catch (error) {
        console.error('Error generating quiz:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating quiz'
        });
    }
};
exports.generateQuiz = generateQuiz;
async function generateQuizInternal(lessonId, lessonContent = null, numberOfQuestions = 5) {
    const lesson = await prisma.lesson.findUnique({
        where: { id: lessonId },
        include: { language: true }
    });
    if (!lesson)
        throw new Error('Lesson not found');
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
    }
    catch (error) {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            quizContent = JSON.parse(jsonMatch[0]);
        }
        else {
            quizContent = [];
        }
    }
    return await prisma.quiz.create({
        data: {
            lessonId,
            questions: quizContent
        }
    });
}
const generateConversationPrompt = async (req, res) => {
    try {
        const { languageId, level, scenario } = req.body;
        const userId = req.user.id;
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
        }
        catch (error) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                conversationContent = JSON.parse(jsonMatch[0]);
            }
            else {
                conversationContent = {
                    context: responseText,
                    vocabulary: [],
                    script: [],
                    culturalNotes: ""
                };
            }
        }
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
    }
    catch (error) {
        console.error('Error generating conversation:', error);
        return res.status(500).json({ message: 'Error generating conversation prompt' });
    }
};
exports.generateConversationPrompt = generateConversationPrompt;
const getPronunciationFeedback = async (req, res) => {
    try {
        const { languageId, audioTranscript, targetSentence } = req.body;
        const userId = req.user.id;
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
        }
        catch (error) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                feedback = JSON.parse(jsonMatch[0]);
            }
            else {
                feedback = {
                    accuracy: 0,
                    feedback: responseText,
                    suggestions: []
                };
            }
        }
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
    }
    catch (error) {
        console.error('Error generating pronunciation feedback:', error);
        return res.status(500).json({ message: 'Error generating pronunciation feedback' });
    }
};
exports.getPronunciationFeedback = getPronunciationFeedback;
const getLessonContent = async (req, res) => {
    var _a;
    try {
        const { lessonId } = req.params;
        const lesson = await prisma.lesson.findUnique({
            where: { id: lessonId },
            include: {
                Quiz: true,
                language: true
            }
        });
        if (!lesson) {
            return res.status(404).json({
                success: false,
                message: 'Lesson not found'
            });
        }
        const quiz = (_a = lesson.Quiz) === null || _a === void 0 ? void 0 : _a[0];
        return res.json({
            success: true,
            lesson: {
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                level: lesson.level,
                languageId: lesson.languageId,
                language: lesson.language,
                content: lesson.content || {
                    vocabulary: [],
                    grammar: "",
                    examples: [],
                    exercises: [],
                    culturalNotes: ""
                },
                quiz: (quiz === null || quiz === void 0 ? void 0 : quiz.questions) || null
            }
        });
    }
    catch (error) {
        console.error('Error fetching lesson:', error);
        return res.status(500).json({
            success: false,
            message: 'Error fetching lesson'
        });
    }
};
exports.getLessonContent = getLessonContent;
//# sourceMappingURL=ai-lessons.controllers.js.map