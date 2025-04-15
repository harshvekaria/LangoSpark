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

interface PronunciationFeedbackRequest {
    languageId: string;
    audioData: string;
    targetText: string;
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

interface PronunciationFeedback {
    accuracy: number;
    feedback: string;
    suggestions: string[];
    phonemes: Array<{
        sound: string;
        accuracy: number;
        feedback: string;
    }>;
}

/**
 * Generate a language lesson using Claude AI
 */
export const generateLesson = async (req: Request, res: Response) => {
    try {
        const { languageId, level, topic } = req.body as LessonRequest;
        const userId = (req as any).user.id; // Get the authenticated user's ID
        
        console.log(`Generating lesson for user ${userId}, language ${languageId}, level ${level}`);

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
                content: lessonContent
            }
        });
        
        console.log(`Lesson created with ID: ${lesson.id}`);

        // Create quiz for the lesson
        await generateQuizInternal(lesson.id, lessonContent);
        
        // Create an initial progress record for this user and lesson
        const progress = await prisma.learningProgress.create({
            data: {
                userId,
                lessonId: lesson.id,
                score: 0,
                completed: false,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });
        
        console.log(`Initial progress record created for lesson ${lesson.id}, user ${userId}`);

        return res.json({
            success: true,
            lesson: {
                ...lesson,
                content: lessonContent
            },
            progress: {
                id: progress.id,
                completed: progress.completed,
                score: progress.score
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

        // Get lesson with its content
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

        // Check if quiz already exists
        if (lesson.Quiz && lesson.Quiz.length > 0) {
            const existingQuiz = lesson.Quiz[0];
            // Ensure questions array exists and is valid
            const questions = Array.isArray(existingQuiz.questions) 
                ? existingQuiz.questions 
                : [];
                
            // Return with consistent structure
            return res.json({ 
                success: true, 
                quiz: {
                    id: existingQuiz.id,
                    lessonId: existingQuiz.lessonId,
                    questions: questions
                }
            });
        }

        // Generate new quiz
        const quiz = await generateQuizInternal(lessonId, lesson.content, numberOfQuestions);
        
        // Ensure questions array exists
        const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
        
        return res.json({ 
            success: true, 
            quiz: {
                id: quiz.id,
                lessonId: quiz.lessonId,
                questions: questions
            }
        });
    } catch (error) {
        console.error('Error generating quiz:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error generating quiz' 
        });
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
        // Make user optional in case authentication is not required
        const userId = (req as any).user?.id;

        // Validate API key
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
            } catch (error) {
                // If parsing fails, try to extract JSON from the response
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    conversationContent = JSON.parse(jsonMatch[0]);
                } else {
                    // If no JSON found, create a structured response
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

            // Store the conversation for later reference
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
        } catch (aiError) {
            console.error('AI service error:', aiError);
            return res.status(500).json({
                success: false,
                message: 'Error generating conversation. Please try again later.'
            });
        }
    } catch (error) {
        console.error('Error generating conversation prompt:', error);
        return res.status(500).json({
            success: false,
            message: 'Error generating conversation prompt'
        });
    }
};

/**
 * Get pronunciation feedback using Claude AI
 */
export const getPronunciationFeedback = async (req: Request, res: Response) => {
    try {
        console.log('Received pronunciation feedback request');
        const { languageId, audioData, targetText, level } = req.body as PronunciationFeedbackRequest;

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

        // Get language details
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
            // Generate feedback using Claude AI with strict JSON formatting
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
            
            // Attempt to parse the response as JSON
            let feedback: PronunciationFeedback;
            try {
                // Try direct parsing first
                feedback = JSON.parse(responseText.trim());
                console.log('Parsed feedback successfully');
            } catch (parseError) {
                console.error('Failed direct JSON parse, attempting to extract JSON:', parseError);
                
                // Try to extract JSON with regex
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        feedback = JSON.parse(jsonMatch[0]);
                        console.log('Parsed feedback from extracted JSON');
                    } catch (extractError) {
                        throw new Error(`Failed to parse extracted JSON: ${extractError}`);
                    }
                } else {
                    throw new Error('No valid JSON found in response');
                }
            }
            
            // Validate feedback structure
            if (!feedback || 
                typeof feedback.accuracy !== 'number' || 
                typeof feedback.feedback !== 'string' || 
                !Array.isArray(feedback.suggestions) || 
                !Array.isArray(feedback.phonemes)) {
                
                console.error('Invalid feedback structure:', feedback);
                throw new Error('Invalid feedback structure from AI');
            }
            
            // Ensure accuracy is a valid number
            if (isNaN(feedback.accuracy) || feedback.accuracy < 0 || feedback.accuracy > 1) {
                feedback.accuracy = 0.5; // Default to 50% if invalid
            }
            
            // Ensure we have at least empty arrays
            if (!feedback.suggestions) feedback.suggestions = [];
            if (!feedback.phonemes) feedback.phonemes = [];
            
            // Store the feedback in the database
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
        } catch (aiError: any) {
            console.error('AI processing error:', aiError);
            
            // Create fallback feedback with more detailed information
            const fallbackFeedback: PronunciationFeedback = {
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
            
            // Store the fallback feedback
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
    } catch (error: any) {
        console.error('Error in getPronunciationFeedback:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate pronunciation feedback'
        });
    }
};

/**
 * Get lesson content by ID
 */
export const getLessonContent = async (req: Request, res: Response) => {
    try {
        const { lessonId } = req.params;

        // Get lesson with its quiz and content
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

        // Get the quiz content with validation
        const quiz = lesson.Quiz?.[0];
        const quizQuestions = quiz && Array.isArray(quiz.questions) 
            ? quiz.questions 
            : [];

        // Return lesson with its content
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
                    id: quiz?.id || '',
                    lessonId: lesson.id,
                    questions: quizQuestions
                }
            }
        });
    } catch (error) {
        console.error('Error fetching lesson:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error fetching lesson' 
        });
    }
};

/**
 * Generate a response to a conversation message
 */
export const getConversationResponse = async (req: Request, res: Response) => {
    try {
        const { languageId, message } = req.body;
        const userId = (req as any).user?.id;

        // Validate required parameters
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

        // Validate API key
        if (!process.env.CLAUDE_API_KEY) {
            console.error('Missing CLAUDE_API_KEY environment variable');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error. Please contact the administrator.'
            });
        }

        // Find the language
        const language = await prisma.language.findUnique({
            where: { id: languageId }
        });

        if (!language) {
            return res.status(404).json({ 
                success: false,
                message: 'Language not found' 
            });
        }

        // Generate response using Claude
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
            
            // Save the conversation exchange if user is authenticated
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
                } catch (dbError) {
                    console.error('Error saving conversation to database:', dbError);
                    // Continue with the response even if saving to DB fails
                }
            }

            return res.json({
                success: true,
                data: {
                    response: responseText
                }
            });
        } catch (aiError) {
            console.error('AI service error:', aiError);
            return res.status(500).json({
                success: false,
                message: 'Error generating conversation response. Please try again later.'
            });
        }
    } catch (error) {
        console.error('Error generating conversation response:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error generating conversation response' 
        });
    }
}; 