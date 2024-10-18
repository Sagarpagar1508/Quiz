const Test = require('../models/Test');
const Admin = require('../models/admin');

// Create a test
exports.createTest = async (req, res) => {
  try {
    const { title, subject, questions, startTime, duration, createdBy, class: testClass } = req.body;
    const test = new Test({ title, subject, questions, startTime, duration, createdBy, class: testClass });
    const test_image = req.file ? req.file.path : undefined;
    await test.save();
    await Admin.findByIdAndUpdate(createdBy, { $push: { testsCreated: test._id } });
    
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

    await Admin.findByIdAndUpdate(test.createdBy, { $pull: { testsCreated: testId } });

    res.status(200).json({ message: 'Test deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all tests created by the Admin
exports.getTestsByAdmin = async (req, res) => {
  try {
    const tests = await Test.find({ createdBy: req.body.AdminId });
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
    const test = await Test.findById(testId).populate('createdBy', 'name email'); // Populate Admin info
    
    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }
    
    res.status(200).json(test);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin registration
exports.registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if Admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin with this email already exists' });
    }

    // Create a new Admin
    const newAdmin = new Admin({
      name,
      email,
      password, // Password will be hashed automatically thanks to the pre-save middleware
    });

    await newAdmin.save();

    res.status(201).json({ message: 'Admin registered successfully', Admin: newAdmin });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
