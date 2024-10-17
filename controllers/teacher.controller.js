const Test = require('../models/Test');
const Teacher = require('../models/teacher');

// Create a test
exports.createTest = async (req, res) => {
  try {
    const { title, subject, questions, startTime, duration, createdBy, class: testClass } = req.body;
    const test = new Test({ title, subject, questions, startTime, duration, createdBy, class: testClass });
    
    await test.save();
    await Teacher.findByIdAndUpdate(createdBy, { $push: { testsCreated: test._id } });
    
    res.status(201).json(test);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Update a test
exports.updateTest = async (req, res) => {
  try {
    const testId = req.params.id;
    const updateData = req.body;
    const test = await Test.findByIdAndUpdate(testId, updateData, { new: true });
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    res.status(200).json(test);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};



// Delete a test
exports.deleteTest = async (req, res) => {
  try {
    const testId = req.params.id;
    const test = await Test.findByIdAndDelete(testId);
    
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    await Teacher.findByIdAndUpdate(test.createdBy, { $pull: { testsCreated: testId } });

    res.status(200).json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all tests created by the teacher
exports.getTestsByTeacher = async (req, res) => {
  try {
    const tests = await Test.find({ createdBy: req.body.teacherId });
    res.status(200).json(tests);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Get test by ID
exports.getTestById = async (req, res) => {
  try {
    const { testId } = req.params;
    
    // Find the test by its ID
    const test = await Test.findById(testId).populate('createdBy', 'name email'); // Populate teacher info
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Teacher registration
exports.registerTeacher = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if teacher already exists
    const existingTeacher = await Teacher.findOne({ email });
    if (existingTeacher) {
      return res.status(400).json({ error: 'Teacher with this email already exists' });
    }

    // Create a new teacher
    const newTeacher = new Teacher({
      name,
      email,
      password, // Password will be hashed automatically thanks to the pre-save middleware
    });

    await newTeacher.save();

    res.status(201).json({ message: 'Teacher registered successfully', teacher: newTeacher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
