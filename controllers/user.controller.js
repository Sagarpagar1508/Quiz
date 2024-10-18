const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Test = require('../models/Test');
const userModel = require('../models/user.model');



// Get a specific test
exports.getTest = async (req, res) => {
    try {
        const testId = req.params.id;
        const test = await Test.findById(testId).select('-createdBy'); // Exclude the 'createdBy' field from the result

        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        // Send the test without answers to prevent cheating
        const sanitizedTest = {
            title: test.title,
            subject: test.subject,
            class: test.class,
            questions: test.questions.map(q => ({
                question: q.question,
                options: q.options
            })),
            startTime: test.startTime,
            duration: test.duration
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

        // Extract userId from URL params
        const updateData = req.body;   // Extract updated user data from request body
        const profile_image = req.file ? req.file.path : undefined;
        // Check if password is being updated
        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt); // Hash the new password
        }

        const data = { ...updateData, profile_image }
        // Find the user by ID and update the document
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: data }, // Update only the fields that are provided
            { new: true, runValidators: true } // Return the updated document and run validation
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

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

        // Find the user by ID and populate only _id, title, and test_image from the 'Test' schema
        const user = await User.findById(userId)
        .select("_id")
            .populate({
                path: 'testsTaken.testId',
                select: '_id title test_image',  // Select only id, title (for name), and test_image
            });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'User retrieved successfully',
            user,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error retrieving user', error });
    }
};



