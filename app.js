const express = require('express');
const app = express()
const testroute = require('./routers/Test.router');
const userroute =require('./routers/user.routes');
const teacherRouter = require('./routers/teacher.router');




const bodyparser = require("body-parser");
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());



app.use('/api/tests', testroute);
app.use('/api', userroute);
app.use('/teacher', teacherRouter);



module.exports = app;