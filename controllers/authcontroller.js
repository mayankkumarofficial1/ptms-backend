const bycrypt = require('bcrypt');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const permissions = require('../config/permissions');

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// // POST api/auth/register
// const register = async (req, res) => {
//     try {
//         const { name, email, password, role,roleId } = req.body;
//         const existingUser = await User.findOne({ email });
//         if (existingUser) {
//             return res.status(400).json({ message: 'User already exists' });
//         }


//         if (!name || !email || !password) {
//             return res.status(400).json({ message: 'All fields are required' });
//         }
//         const hashedPassword = await bycrypt.hash(password, 10);

//         const user = await User.create({
//             name,
//             email,
//             password: hashedPassword,
//             // role: role || "EMPLOYEE"
//             roleId
//         });

//         return res.status(201).json({ 
//             message: 'User registered successfully',
//             user: {
//                 id: user._id,
//                 name: user.name,
//                 email: user.email,
//                 // role: user.role,
//                 roleId:user.roleId,
//                 isActive: user.isActive
//             }
//         });
//     } catch (error) {
//         console.error('Error registering user:', error);
//         return res.status(500).json({ message: 'Server error', error: error.message });
//     }
// };



// api/auth/login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }
        const user = await User.findOne({ email }).populate ('roleId');
        if (!user) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        const isPasswordValid = await bycrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid email or password' });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: 'User account is inactive' });
        }

        const token = generateToken(user);

        
        return res.status(200).json({ 
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                // role: user.role,
                permissions:user.roleId.permissions,
                roleId:user.roleId,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Error during login:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};


const changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT middleware
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findById(userId);

    const isMatch = await bycrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const salt = await bycrypt.genSalt(10);
    user.password = await bycrypt.hash(newPassword, salt);

    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
    register,login,changePassword
};

