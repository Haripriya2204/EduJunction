const requestRoutes = require('./routes/requestRoutes');
const courseRoutes = require('./routes/courseRoutes');
const electivesRoutes = require('./routes/electives');

app.use('/api/requests', requestRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/electives', electivesRoutes); 