const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacher.controller');

// Middleware for checking teacher role (this should be expanded in practice)
const isTeacher = async (req, res, next) => {
  // This is a placeholder; you'd typically verify the role from the request or token
  if (req.body.role !== 'teacher') {
    return res.status(403).send('Access denied. Only teachers can perform this action.');
  }
  next();
};

// Teacher routes
router.post('/test', teacherController.createTest);
// validation to have only teacher has add
// router.put('/test/:id', isTeacher, teacherController.updateTest);
router.put('/test/:id', teacherController.updateTest);
router.delete('/test/:id', teacherController.deleteTest);
router.get('/tests', teacherController.getTestsByTeacher);
router.post('/register', teacherController.registerTeacher);
router.get('/:testId',  teacherController.getTestById);

module.exports = router;
