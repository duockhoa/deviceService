const { User, UserManagers } = require('../models/tables');

// Get all users
exports.getAll = async (req, res, next) => {
        try {
            const users = await User.findAll(
                {
                    include: [
                        {
                            model: UserManagers,
                            as: 'managedUsers',
                        }
                    ],
                    attributes: { exclude: ['password'] } // Exclude password from the response
                }
            );
            res.status(200).send({ result: users });
            if( users.error) {
                return res.status(500).send({ error: users.error });
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            res.status(500).send({ error: 'Error fetching users' });
        }
};

// Get user by ID
exports.getById = async (req, res, next) => {
    const id = req.params.id;
    if (!id) {
        return res.status(400).send({ error: 'No ID provided' });
    }
    try {
        const user = await User.findByPk(id);
      
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        if( user.error) {
            return res.status(500).send({ error: user.error });
        }
        res.status(200).send({ result: user });
    } catch (error) {
        res.status(500).send({ error: 'Error fetching user' });
    }
};

// Create a new user
exports.createOne = async (req, res, next) => {
    const body = req.body;
    const managers = body.managers || [];
    if (!body || Object.keys(body).length === 0) {
        return res.status(400).send({ error: 'Invalid input data' });
    }
    try {
    const user = await User.create(body);
    if (!user) {
        return res.status(500).send({ error: 'Error creating user' });
    }

    if (managers.length === 0) {
        return res.status(201).send({ result: user });
    }
    // Create user-manager associations
    console.log (managers)
    const userManagerPromises = managers.map(manager => {
        return UserManagers.create({ user_id: user.id, manager_id: manager.user_id, level: manager.level  });
    });
    await Promise.all(userManagerPromises);



    res.status(201).send({ result: user });
    }
    catch (error) {
        res.status(500).send({ error: 'Error creating user' });
    }
};


// Update a user by ID
exports.updateOne = async (req, res, next) => {
  const userId = req.params.id;
    const updateData = req.body;

    try {
        const [affectedRows] = await User.update(updateData, {
            where: { id: userId }
        });

        if (affectedRows === 0) {
            return res.status(404).json({ error: 'User not found or no changes made' });
        }

        // Lấy lại thông tin user sau khi update
        const updatedUser = await User.findByPk(userId);
        res.status(200).json({ result: updatedUser });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateAvatar = async (req, res, next) => {
    const file = req.file;
    if (!file) {
        return res.status(400).send({ error: 'No file uploaded' });
    }
    const id = req.body.id;
    if (!id) {
        return res.status(400).send({ error: 'No ID provided' });
    }
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }
        user.avatar = file.path;
        await user.save();
        return res.status(200).send({ result: 'Avatar updated successfully', avatarPath: file.path });
    } catch (error) {
        return res.status(500).send({ error: 'Error updating avatar' });
    }
};



exports.updatePassword = async (req, res, next) => {
    const { id, password, newPassWord } = req.body;
    if (!id || !password || !newPassWord) {
        return res.status(400).send({ error: 'Invalid input data' });
    }

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        // Kiểm tra mật khẩu cũ
        if (user.password !== password) {
            return res.status(401).send({ error: 'Incorrect current password' });
        }

        // Kiểm tra mật khẩu mới
        if (newPassWord.length < 6) {
            return res.status(400).send({ error: 'New password must be at least 6 characters long' });
        }
        if (newPassWord === password) {
            return res.status(400).send({ error: 'New password must be different from the current password' });
        }

        // Cập nhật mật khẩu mới
        user.password = newPassWord;
        await user.save();

        res.status(200).send({ result: 'Password updated successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error updating password' });
    }
};

