const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');  
const mongoose = require('mongoose');
const Role = require('./models/Role');
const roleRoutes = require('./routes/roleRoutes');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('PTMS Backend is running');
});

app.use('/api/roles', roleRoutes);

const seedRoles = async () => {
  const roles = [
    {
      name: "ADMIN",
      permissions: ["*"],
      isSystemRole: true,
    },
    {
      name: "MANAGER",
      permissions: [
        "project.read",
        "project.create",
        "project.update",
        "task.read",
        "task.create",
        "task.assign",
        "task.update_status",
        "task.dependency",
        "task.comment",
        "report.view",
        "activity.view",
      ],
    },
    {
      name: "EMPLOYEE",
      permissions: [
        "task.read",
        "task.update_status",
        "task.comment",
      ],
    },
  ];

  try {
    for (const role of roles) {
      const exists = await Role.findOne({ name: role.name });
      if (!exists) {
        await Role.create(role);
        console.log(`✅ Role ${role.name} created`);
      }
    }
  } catch (error) {
    console.error('Error seeding roles:', error.message);
  }
};

// Connect to database and then seed roles
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
    
    // Seed roles after successful connection
    await seedRoles();
    
    // Start the server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
};

app.use("/api/auth", require('./routes/authroute'));
app.use("/api/users", require('./routes/userroutes'));
app.use("/api/projects", require("./routes/projectroutes"));
app.use("/api/tasks", require("./routes/taskroute"));
app.use("/api/comments", require("./routes/commentroute"));
app.use("/api/activity", require("./routes/activityroute"));



app.use("/api/auth", require('./routes/authroute'));
app.use("/api/users", require('./routes/userroutes'));
app.use("/api/projects", require("./routes/projectroutes"));
app.use("/api/tasks", require("./routes/taskroute"));
app.use("/api/comments", require("./routes/commentroute"));
app.use("/api/activity", require("./routes/activityroute"));

startServer();

