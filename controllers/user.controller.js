const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Test = require('../models/Test');
const userModel = require('../models/user.model');
const { default: mongoose } = require('mongoose');




// Controller to get  tests by subject and retrieve test_image
exports.getTestCountBySubject = async (req, res) => {
    try {
        // MongoDB aggregation to group by subject, count tests, and get test_image
        const testCounts = await Test.aggregate([
            {
                $group: {
                    _id: "$subject", // Group by subject
                    test_image: { $first: "$test_image" } // Get the first test_image for each subject group
                }
            },
            {
                $project: {
                    _id: 0, // Exclude the default _id field
                    subject: "$_id", // Include the subject field
                    test_image: 1 // Include the test_image field
                }
            }
        ]);

        // If no tests found
        if (testCounts.length === 0) {
            return res.status(404).json({ message: 'No tests found' });
        }

        // Return the grouped test count data with subject and test_image
        res.status(200).json({
            message: 'Test count by subject retrieved successfully',
            data: testCounts,
        });
    } catch (error) {
        console.error('Error retrieving test count:', error);
        res.status(500).json({ message: 'Error retrieving test count', error });
    }
};

// Controller to get topics and quizzes by subject name
exports.getTopicsAndQuizzesBySubject = async (req, res) => {
    try {
        const { subject } = req.params;  // Get the subject from the URL params

        // MongoDB aggregation pipeline to match subject, group by topic, and retrieve quizzes
        const topicsWithQuizzes = await Test.aggregate([
            {
                $match: { subject: subject } // Match the subject
            },
            {
                $group: {
                    _id: "$topic", // Group by topic
                    quizzes: {
                        $push: {
                            title: "$title",         // Quiz title
                            test_image: "$test_image" // Quiz image
                        }
                    },
                    quizCount: { $sum: 1 } // Count quizzes per topic
                }
            },
            {
                $project: {
                    _id: 0, // Exclude the default _id field
                    topic: "$_id", // Topic name
                    quizzes: 1, // Include the list of quizzes
                    quizCount: 1 // Include the count of quizzes
                }
            }
        ]);

        // If no topics or quizzes found for the subject
        if (topicsWithQuizzes.length === 0) {
            return res.status(404).json({ message: 'No topics or quizzes found for the specified subject' });
        }

        // Return the topics and their quizzes
        res.status(200).json({
            message: 'Topics and quizzes retrieved successfully',
            data: topicsWithQuizzes,
        });
    } catch (error) {
        console.error('Error retrieving topics and quizzes:', error);
        res.status(500).json({ message: 'Error retrieving topics and quizzes', error });
    }
};

// Get a specific test details
exports.getTest = async (req, res) => {
    try {
        const testId = req.params.id;
        const test = await Test.findById(testId);

        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        // Send the test without answers to prevent cheating
        const sanitizedTest = {
            title: test.title,
            subject: test.subject,
            class: test.class,
            description: test.description,
            createdBy: test.createdBy
        };

        res.status(200).json(sanitizedTest);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch test data' });
    }
};


// Get a specific test Quiz
exports.getTestQuiz = async (req, res) => {
    try {
        const testId = req.params.id;
        const test = await Test.findById(testId);

        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        // Send the test without answers to prevent cheating
        const sanitizedTest = {
            questions: test.questions
        };

        res.status(200).json(sanitizedTest);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch test data' });
    }
};







// Submit test answers
exports.submitTest = async (req, res) => {
    try {
        const testId = req.params.id;
        const { answers, studentId } = req.body;


        // Validate test existence
        const test = await Test.findById(testId);

        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        // Validate input data
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Answers must be provided as an array.' });
        }
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required.' });
        }

        let score = 0;
        const totalQuestions = test.questions.length;

        // Evaluate answers
        test.questions.forEach((question, index) => {
            const userAnswer = answers[index];
            const correctAnswer = question.correctAnswer?.trim().toLowerCase();



            if (userAnswer && userAnswer === correctAnswer) {
                score += 1;
            }
        });

        const finalScore = (score / totalQuestions) * 100;

        // Update student's test history
        const student = await userModel.findByIdAndUpdate(
            studentId,
            { $push: { testsTaken: { testId, score: finalScore } } },
            { new: true }
        );

        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        // Send the final score and result
        res.status(200).json({
            message: 'Test submitted successfully',
            score: finalScore,
            totalQuestions,
            correctAnswers: score,
            wrongAnswers: totalQuestions - score
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit test answers' });
    }
};

// JWT secret (store this in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'bhojsoft';
// Register a new user
exports.registerUser = async (req, res) => {
    const { name, email, password, phone } = req.body;

    try {
        // Check if the email is already in use
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'Email already in use.' });
        }

        // Create a new user
        user = new User({ name, email, password, phone });
        await user.save();

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET);

        res.status(201).json({ token, user });
    } catch (err) {
        res.status(500).json({ message: 'Error registering user', error: err.message });
    }
};

// Login user
exports.loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Compare the entered password with the stored hashed password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET);

        res.status(200).json({ token, user });
    } catch (err) {
        res.status(500).json({ message: 'Error logging in', error: err.message });
    }
};


// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId); // Assuming req.user is set by the auth middleware

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,

        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};



// Controller to update user details
exports.updateUser = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Find the user by ID to fetch current data
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Extract updated data from request body and profile image from the request
        const updateData = req.body;
        const profile_image = req.file ? req.file.path : existingUser.profile_image; // Retain current image if not updated

        // Check if password is being updated and hash it if provided
        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt); // Hash the new password
        }

        // Merge existing data with updated data; keep existing fields if not provided
        const data = {
            ...existingUser.toObject(), // Spread current user data
            ...updateData,              // Overwrite with new data
            profile_image               // Ensure the profile image is updated correctly
        };

        // Find the user by ID and update the document
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: data }, // Update the merged data
            { new: true, runValidators: true } // Return the updated document and run validation
        );

        res.status(200).json({
            message: 'User updated successfully',
            updatedUser,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating user', error });
    }
};


// Controller to retrieve user and populate testsTaken with test details
exports.getUserWithTests = async (req, res) => {
    try {
        const { userId } = req.params;  // Extract userId from URL params

        // Check if userId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        // Find the user by ID and populate only _id, title, and test_image from the 'Test' schema
        const user = await User.findById(userId)
            .select("_id")
            .populate({
                path: 'testsTaken.testId',
                select: '_id subject test_image',  // Select only id, title (for name), and test_image
                // model: Test,  // Make sure to reference the Test model explicitly
            });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Log the result to see what's being returned
        console.log('User with tests:', user);

        res.status(200).json({
            message: 'User retrieved successfully',
            user,
        });
    } catch (error) {
        console.error('Error retrieving user and tests:', error);
        res.status(500).json({ message: 'Error retrieving user', error });
    }
};



