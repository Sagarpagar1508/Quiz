const express = require("express");
const router = express.Router();
const Course = require("../models/cource.model");
const multer = require("multer");
const { ApiResponse } = require("../utils/ApiResponse");
const { ApiError } = require("../utils/ApiError");
const registration = require("../models/admin");
const NotificationModel = require("../models/notification.model");
const { checkUserRole } = require("../middlewares/authMiddleware");

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: fileFilter,
});

// Route to get paginated courses
router.get('/', async (req, res, next) => {
    try {
      const baseUrl = req.protocol + '://' + req.get('host');
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 4;
      const skip = (page - 1) * limit;
  
      // Query to get courses with pagination
      const courses = await Course.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
  
      // Format courses to include full image URLs and calculated duration
      const coursesWithFullImageUrls = courses.map((course) => ({
        _id: course._id,
        course_name: course.course_name || '',
        online_offline: course.online_offline || '',
        thumbnail_image: course.thumbnail_image
          ? `${baseUrl}/${course.thumbnail_image.replace(/\\/g, '/')}`
          : '',
        course_duration: Math.floor(
          Math.round(
            ((course.end_date - course.start_date) / (1000 * 60 * 60 * 24 * 7)) *
              100
          ) / 100
        ),
        price: course.price || '',
        offer_prize: course.offer_prize || '',
      }));
  
      const totalCourses = await Course.countDocuments();
      const totalPages = Math.ceil(totalCourses / limit);
  
      // Send response
      res.status(200).json({
        courses: coursesWithFullImageUrls,
        currentPage: page,
        totalPages,
        totalCourses,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error', error: err.message });
    }
  });

// Route to create a new course
router.post(
    '/',
    upload.fields([
      { name: 'thumbnail_image', maxCount: 1 }
    ]),
    checkUserRole,
    async (req, res) => {
      const course = new Course({
        course_name: req.body.course_name,
        online_offline: req.body.online_offline,
        price: req.body.price,
        offer_prize: req.body.offer_prize,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        tags: req.body.tags,
        course_brief_info: req.body.course_brief_info,
        course_information: req.body.course_information,
        thumbnail_image: req.files['thumbnail_image']
          ? req.files['thumbnail_image'][0].path
          : ''
      });
  
      try {
        // Save the new course to the database
        const savedCourse = await course.save();
  
        // Send notification to the user who created the course
        const notification = new NotificationModel({
          recipient: req.user.id,
          message: `Your course "${savedCourse.course_name}" has been created successfully.`,
          activityType: 'COURSE_CREATE',
          relatedId: savedCourse._id,
        });
  
        await notification.save();
  
        // Send success response
        res.status(200).json({
          success: true,
          message: 'Course added successfully',
          course: savedCourse
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({
          success: false,
          message: 'Server error',
          error: err.message
        });
      }
    }
  );

// ========================= course/:id ====================================
// Get course by ID
router.get("/:id", async (req, res) => {
  const baseUrl = req.protocol + "://" + req.get("host");

  try {
    const courseData = await Course.findById(req.params.id);

    if (!courseData) {
      return res.status(404).json({
        success: false,
        message: "Course not found. Invalid course ID"
      });
    }

    // If reviews field exists and is populated
    const reviews = courseData.reviews || [];
    const totalStars = reviews.reduce((sum, review) => sum + review.star_count, 0);
    const averageRating = reviews.length ? totalStars / reviews.length : 0;

    const courseWithFullImageUrls = {
      _id: courseData?._id,
      course_name: courseData?.course_name || "",
      course_brief_info: courseData?.course_brief_info || "",
      course_information: courseData?.course_information || "",
      online_offline: courseData?.online_offline || "",
      thumbnail_image: courseData?.thumbnail_image
        ? `${baseUrl}/${courseData.thumbnail_image.replace(/\\/g, "/")}`
        : "",
      start_date: courseData?.start_date || "",
      end_date: courseData?.end_date || "",
      start_time: courseData?.start_time || "",
      end_time: courseData?.end_time || "",
      course_rating: averageRating || 0,
      course_duration: Math.floor(
        ((courseData?.end_date - courseData?.start_date) / (1000 * 60 * 60 * 24 * 7)) * 100
      ) / 100,
      price: courseData?.price || "",
      tags: courseData?.tags || "",
      offer_prize: courseData?.offer_prize || "",
    };

    res.status(200).json({
      success: true,
      course: courseWithFullImageUrls
    });
  } catch (err) {
    console.error("Error fetching course:", err);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: err.message
    });
  }
});

// Update course by ID
router.put(
    "/:id",
    upload.fields([{ name: "thumbnail_image", maxCount: 1 }]), // Update more fields if needed
    checkUserRole,
    async (req, res) => {
      const courseId = req.params.id;
      
      // Prepare the update data
      const updateData = {
        course_name: req.body.course_name,
        online_offline: req.body.online_offline,
        price: req.body.price,
        offer_prize: req.body.offer_prize,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        tags: req.body.tags,
        course_brief_info: req.body.course_brief_info,
        course_information: req.body.course_information,
        thumbnail_image: req.files["thumbnail_image"]
          ? req.files["thumbnail_image"][0].path
          : undefined, // Update only if a new file is uploaded
        trainer_materialImage: req.files["trainer_materialImage"]
          ? req.files["trainer_materialImage"][0].path
          : undefined, // Update only if a new file is uploaded
        category_id: req.body.category_id,
        trainer_id: req.user.id,
      };
  
      // Remove undefined fields to prevent overwriting existing data
      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
  
      try {
        // Update course information
        const updatedCourse = await Course.findByIdAndUpdate(
          courseId,
          updateData,
          { new: true, runValidators: true }
        );
  
        // If no course is found, return 404
        if (!updatedCourse) {
          return res.status(404).json({
            success: false,
            message: "Course not found"
          });
        }
  
        // Create and save a notification for the trainer
        const notification = new NotificationModel({
          recipient: req.user.id,
          message: `Your course "${updatedCourse.course_name}" has been updated successfully.`,
          activityType: "COURSE_UPDATE",
          relatedId: updatedCourse._id,
        });
        await notification.save();
  
        // Notify registered users (if any) about the course update
        const attendees = updatedCourse.registered_users;
        if (attendees?.length) {
          const notifications = attendees.map((attendee) => ({
            recipient: attendee,
            message: `The course "${updatedCourse.course_name}" has been updated.`,
            activityType: "COURSE_UPDATE",
            relatedId: updatedCourse._id,
          }));
          await NotificationModel.insertMany(notifications);
        }
  
        // Send success response with updated course
        res.status(200).json({
          success: true,
          message: "Course updated successfully",
          course: updatedCourse,
        });
      } catch (err) {
        console.error("Error updating course:", err);
        res.status(500).json({
          success: false,
          message: "Server Error",
          error: err.message,
        });
      }
    }
  );



// Delete course by ID
router.delete("/:id", async (req, res) => {
    try {
      const courseId = req.params.id;
  
      // Find course by ID
      const course = await Course.findById(courseId);
  
      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found",
        });
      }
  
      // Delete the course
      await Course.deleteOne({ _id: courseId });
  
      // Notify registered users (if any)
      const attendees = course.registered_users;
  
      if (attendees?.length) {
        const notifications = attendees.map((attendee) => ({
          recipient: attendee,
          message: `The course "${course.course_name}" has been deleted.`,
          activityType: "COURSE_DELETE",
          relatedId: course._id,
        }));
        await NotificationModel.insertMany(notifications); // Insert all notifications for attendees
      }
  
      // Send notification to the course creator
      const notification = new NotificationModel({
        recipient: req.user.id,
        message: `Your course "${course.course_name}" has been deleted successfully.`,
        activityType: "COURSE_DELETE",
        relatedId: course._id,
      });
      await notification.save();
  
      // Send success response
      res.status(200).json({
        success: true,
        message: "Course deleted successfully and notifications sent.",
      });
    } catch (error) {
      console.error("Error deleting course:", error);
      res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message,
      });
    }
  });



module.exports = router;
