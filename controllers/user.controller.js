const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Test = require('../models/Test');
const userModel = require('../models/user.model');



// Get a specific test
exports.getTest = async (req, res) => {
    try {
        const testId = req.params.id;
        const test = await Test.findById(testId);

        if (!test) {
            return res.status(404).json({ error: 'Test not found' });
        }

        res.status(200).json(test);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Submit test answers
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

        // Validate answers and studentId presence
        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ error: 'Answers must be provided as an array.' });
        }
        if (!studentId) {
            return res.status(400).json({ error: 'Student ID is required.' });
        }

        let score = 0;
        // Iterate through the test questions and answers
        test.questions.forEach((question, index) => {
            const userAnswer = answers[index].answer; // Handle undefined answers
            if (userAnswer && userAnswer === question.correctAnswer) {
                score += 1;
            }
        });

        const totalQuestions = test.questions.length;
        const finalScore = (score / totalQuestions) * 100;

        // Update student's test history
        await userModel.findByIdAndUpdate(studentId, {
            $push: { testsTaken: { testId, score: finalScore } },
        });

        res.status(200).json({ message: 'Test submitted successfully', score: finalScore, totalQuestions });
    } catch (error) {
        console.log(error);
        res.status(400).json({ error: error.message });
    }
};


// JWT secret (store this in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'bhojsoft';
// Register a new user
exports.registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        // Check if the email is already in use
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'Email already in use.' });
        }

        // Create a new user
        user = new User({ name, email, password });
        await user.save();

        // Generate JWT token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

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
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

        res.status(200).json({ token, user });
    } catch (err) {
        res.status(500).json({ message: 'Error logging in', error: err.message });
    }
};


// Get user profile
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id); // Assuming req.user is set by the auth middleware

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
           
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Update user information
exports.updateUser = async (req, res) => {
    try {
        const { name, role } = req.body;
        const updatedUser = await User.findByIdAndUpdate(req.params.userId,  { new: true });

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({
            message: 'User updated successfully.',
            user: updatedUser,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};


