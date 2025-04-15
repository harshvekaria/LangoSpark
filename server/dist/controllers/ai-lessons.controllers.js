"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConversationResponse = exports.getLessonContent = exports.getPronunciationFeedback = exports.generateConversationPrompt = exports.generateQuiz = exports.generateLesson = void 0;
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
            const existingQuiz = lesson.Quiz[0];
            const questions = Array.isArray(existingQuiz.questions)
                ? existingQuiz.questions
                : [];
            return res.json({
                success: true,
                quiz: {
                    id: existingQuiz.id,
                    lessonId: existingQuiz.lessonId,
                    questions: questions
                }
            });
        }
        const quiz = await generateQuizInternal(lessonId, lesson.content, numberOfQuestions);
        const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
        return res.json({
            success: true,
            quiz: {
                id: quiz.id,
                lessonId: quiz.lessonId,
                questions: questions
            }
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
    var _a;
    try {
        const { languageId, level, scenario } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!process.env.CLAUDE_API_KEY) {
            console.error('Missing CLAUDE_API_KEY environment variable');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error. Please contact the administrator.'
            });
        }
        const language = await prisma.language.findUnique({
            where: { id: languageId }
        });
        if (!language) {
            return res.status(404).json({
                success: false,
                message: 'Language not found'
            });
        }
        try {
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
                        "script": [{"${language.code}": "", "english": ""}],
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
                        context: "Practice conversation",
                        vocabulary: [],
                        script: [
                            { [language.code]: "Hello", english: "Hello" },
                            { [language.code]: "How are you?", english: "How are you?" }
                        ],
                        culturalNotes: ""
                    };
                }
            }
            const conversation = await prisma.conversationPractice.create({
                data: {
                    userId,
                    transcript: {
                        languageId,
                        level: level || 'BEGINNER',
                        scenario: scenario || 'General conversation',
                        content: conversationContent
                    }
                }
            });
            return res.json({
                success: true,
                conversation: {
                    id: conversation.id,
                    languageId,
                    level,
                    scenario: scenario || 'General conversation',
                    content: conversationContent
                }
            });
        }
        catch (aiError) {
            console.error('AI service error:', aiError);
            return res.status(500).json({
                success: false,
                message: 'Error generating conversation. Please try again later.'
            });
        }
    }
    catch (error) {
        console.error('Error generating conversation prompt:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating conversation prompt'
        });
    }
};
exports.generateConversationPrompt = generateConversationPrompt;
const getPronunciationFeedback = async (req, res) => {
    try {
        console.log('Received pronunciation feedback request');
        const { languageId, audioData, targetText, level } = req.body;
        if (!languageId || !audioData || !targetText || !level) {
            console.error('Missing required parameters:', {
                languageId,
                hasAudioData: !!audioData,
                targetText,
                level
            });
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: languageId, audioData, targetText, and level are required'
            });
        }
        const language = await prisma.language.findUnique({
            where: { id: languageId }
        });
        if (!language) {
            console.error('Language not found:', languageId);
            return res.status(404).json({
                success: false,
                error: 'Language not found'
            });
        }
        console.log('Generating feedback for:', {
            language: language.name,
            targetText,
            level,
            audioDataLength: audioData.length
        });
        try {
            const message = await anthropic.messages.create({
                model: 'claude-3-opus-20240229',
                max_tokens: 1000,
                system: "You are an expert language pronunciation analyzer. You MUST respond with ONLY valid JSON in the exact format shown. Do not include any text before or after the JSON response. Keep your analysis concise and helpful.",
                messages: [{
                        role: 'user',
                        content: `Analyze this audio recording of a ${level.toLowerCase()} level student saying this ${language.name} phrase: "${targetText}"
                    
                    RESPOND ONLY WITH VALID JSON in this exact format with no preamble or additional text:
                    
                    {
                        "accuracy": 0.7,
                        "feedback": "Clear overall feedback about the pronunciation...",
                        "suggestions": [
                            "First specific suggestion",
                            "Second specific suggestion"
                        ],
                        "phonemes": [
                            {
                                "sound": "specific sound",
                                "accuracy": 0.8,
                                "feedback": "feedback for this sound"
                            }
                        ]
                    }
                    
                    Notes:
                    - accuracy must be a number between 0.0 and 1.0
                    - include 2-4 actionable suggestions
                    - analyze key phonemes with clear feedback
                    - be encouraging and constructive
                    - focus on the most important improvements`
                    }]
            });
            console.log('Received AI response');
            const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
            let feedback;
            try {
                feedback = JSON.parse(responseText.trim());
                console.log('Parsed feedback successfully');
            }
            catch (parseError) {
                console.error('Failed direct JSON parse, attempting to extract JSON:', parseError);
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        feedback = JSON.parse(jsonMatch[0]);
                        console.log('Parsed feedback from extracted JSON');
                    }
                    catch (extractError) {
                        throw new Error(`Failed to parse extracted JSON: ${extractError}`);
                    }
                }
                else {
                    throw new Error('No valid JSON found in response');
                }
            }
            if (!feedback ||
                typeof feedback.accuracy !== 'number' ||
                typeof feedback.feedback !== 'string' ||
                !Array.isArray(feedback.suggestions) ||
                !Array.isArray(feedback.phonemes)) {
                console.error('Invalid feedback structure:', feedback);
                throw new Error('Invalid feedback structure from AI');
            }
            if (isNaN(feedback.accuracy) || feedback.accuracy < 0 || feedback.accuracy > 1) {
                feedback.accuracy = 0.5;
            }
            if (!feedback.suggestions)
                feedback.suggestions = [];
            if (!feedback.phonemes)
                feedback.phonemes = [];
            console.log('Storing feedback in database');
            await prisma.pronunciationFeedback.create({
                data: {
                    userId: req.user.id,
                    sentence: targetText,
                    accuracy: feedback.accuracy,
                    feedback: JSON.stringify(feedback)
                }
            });
            console.log('Sending response to client');
            return res.json({
                success: true,
                feedback
            });
        }
        catch (aiError) {
            console.error('AI processing error:', aiError);
            const fallbackFeedback = {
                accuracy: 0.7,
                feedback: `We heard your pronunciation of "${targetText}". While our AI couldn't provide detailed analysis this time, your attempt was recorded.`,
                suggestions: [
                    "Focus on speaking clearly and at a moderate pace",
                    "Make sure your microphone is working properly",
                    "Try practicing one short phrase at a time"
                ],
                phonemes: [
                    {
                        sound: targetText.split(' ')[0],
                        accuracy: 0.7,
                        feedback: "Focus on clear articulation of this word"
                    }
                ]
            };
            await prisma.pronunciationFeedback.create({
                data: {
                    userId: req.user.id,
                    sentence: targetText,
                    accuracy: fallbackFeedback.accuracy,
                    feedback: JSON.stringify(fallbackFeedback)
                }
            });
            return res.json({
                success: true,
                feedback: fallbackFeedback
            });
        }
    }
    catch (error) {
        console.error('Error in getPronunciationFeedback:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate pronunciation feedback'
        });
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
        const quizQuestions = quiz && Array.isArray(quiz.questions)
            ? quiz.questions
            : [];
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
                quiz: {
                    id: (quiz === null || quiz === void 0 ? void 0 : quiz.id) || '',
                    lessonId: lesson.id,
                    questions: quizQuestions
                }
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
const getConversationResponse = async (req, res) => {
    var _a;
    try {
        const { languageId, message } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!languageId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameter: languageId'
            });
        }
        if (!message || typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Missing or invalid message'
            });
        }
        if (!process.env.CLAUDE_API_KEY) {
            console.error('Missing CLAUDE_API_KEY environment variable');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error. Please contact the administrator.'
            });
        }
        const language = await prisma.language.findUnique({
            where: { id: languageId }
        });
        if (!language) {
            return res.status(404).json({
                success: false,
                message: 'Language not found'
            });
        }
        try {
            const aiResponse = await anthropic.messages.create({
                model: 'claude-3-sonnet-20240229',
                max_tokens: 500,
                messages: [{
                        role: 'user',
                        content: `You are a language learning assistant for ${language.name}. Respond to this message from a language learner: "${message}"
                    
                    Your response should:
                    1. Be helpful and encouraging
                    2. Use simple language appropriate for their level
                    3. Provide corrections if there are grammar mistakes
                    4. Include the correct ${language.name} phrases when appropriate
                    
                    Keep your response conversational, friendly and under 150 words.`
                    }]
            });
            const responseText = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '';
            if (userId) {
                try {
                    await prisma.conversationExchange.create({
                        data: {
                            userId,
                            languageId,
                            userMessage: message,
                            aiResponse: responseText
                        }
                    });
                }
                catch (dbError) {
                    console.error('Error saving conversation to database:', dbError);
                }
            }
            return res.json({
                success: true,
                data: {
                    response: responseText
                }
            });
        }
        catch (aiError) {
            console.error('AI service error:', aiError);
            return res.status(500).json({
                success: false,
                message: 'Error generating conversation response. Please try again later.'
            });
        }
    }
    catch (error) {
        console.error('Error generating conversation response:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating conversation response'
        });
    }
};
exports.getConversationResponse = getConversationResponse;
//# sourceMappingURL=ai-lessons.controllers.js.map