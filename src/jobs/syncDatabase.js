const axios = require("../service/AuthService/authAxios");
const login = require("../service/AuthService/loginAuth");
const { User, Departments } = require("../models/index");

// Helper function to compare department data
const hasDepartmentDataChanged = (existingDepartment, newDepartmentData) => {
    const fieldsToCheck = [
        'name',
        'description',
        'team_leader'
    ];

    for (const field of fieldsToCheck) {
        const existingValue = existingDepartment[field] || '';
        const newValue = newDepartmentData[field] || '';

        if (existingValue.toString().trim() !== newValue.toString().trim()) {
            return true;
        }
    }

    return false;
};

// Helper function to get changed fields for department
const getDepartmentChangedFields = (existingDepartment, newDepartmentData) => {
    const changes = {};
    const fieldsToCheck = [
        'name',
        'description',
        'team_leader'
    ];

    for (const field of fieldsToCheck) {
        const existingValue = existingDepartment[field] || '';
        const newValue = newDepartmentData[field] || '';

        if (existingValue.toString().trim() !== newValue.toString().trim()) {
            changes[field] = {
                old: existingValue,
                new: newValue
            };
        }
    }

    return changes;
};

// Helper function to compare user data
const hasUserDataChanged = (existingUser, newUserData) => {
    const fieldsToCheck = [
        'name',
        'email',
        'department',
        'position',
        'avatar',
        'phoneNumber',
        'sex'
    ];

    for (const field of fieldsToCheck) {
        const existingValue = existingUser[field] || '';
        const newValue = newUserData[field] || '';

        if (existingValue.toString().trim() !== newValue.toString().trim()) {
            return true;
        }
    }

    return false;
};

// Helper function to get changed fields
const getChangedFields = (existingUser, newUserData) => {
    const changes = {};
    const fieldsToCheck = [
        'name',
        'email',
        'department',
        'position',
        'avatar',
        'phoneNumber',
        'sex'
    ];

    for (const field of fieldsToCheck) {
        const existingValue = existingUser[field] || '';
        const newValue = newUserData[field] || '';

        if (existingValue.toString().trim() !== newValue.toString().trim()) {
            changes[field] = {
                old: existingValue,
                new: newValue
            };
        }
    }

    return changes;
};

const syncDatabase = async () => {
    try {
        const authResponse = await login("0596", "My123456@");
        if (!authResponse || !authResponse.accessToken) {
            console.error("Login failed: No access token received");
            return null;
        }

        const token = authResponse.accessToken;
        console.log("Login successful, fetching users...");

        // Lấy danh sách users từ Auth Service
        const usersResponse = await axios.get('users', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });


        const users = usersResponse.data.result || [];
        console.log(`Fetched ${users.length} users from Auth Service`);

        // Đồng bộ từng user vào database
        let syncedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const userData of users) {
            try {
                // Kiểm tra user đã tồn tại chưa (dựa trên employee_code)
                const existingUser = await User.findOne({
                    where: {
                        employee_code: userData.employee_code
                    }
                });

                if (existingUser) {
                    // Kiểm tra có thay đổi không
                    if (hasUserDataChanged(existingUser, userData)) {
                        const changedFields = getChangedFields(existingUser, userData);

                        // Cập nhật user hiện tại
                        await existingUser.update({
                            id: userData.id,
                            name: userData.name,
                            email: userData.email,
                            department: userData.department,
                            position: userData.position,
                            avatar: userData.avatar,
                            phoneNumber: userData.phoneNumber || '',
                            sex: userData.sex,
                            updateAt: new Date()
                        });

                        updatedCount++;

                        // Optional: Log detailed changes in development
                        if (process.env.NODE_ENV === 'development') {
                            console.log('Detailed changes:', changedFields);
                        }
                    } else {
                        skippedCount++;
                    }
                } else {
                    // Tạo user mới
                    await User.create({
                        id: userData.id,
                        employee_code: userData.employee_code,
                        name: userData.name,
                        email: userData.email,
                        department: userData.department,
                        position: userData.position,
                        avatar: userData.avatar,
                        phoneNumber: userData.phoneNumber || '',
                        password: 'default123', // Mật khẩu mặc định - có thể thay đổi
                        sex: userData.sex,
                        createAt: new Date(),
                        updateAt: new Date()
                    });
                    syncedCount++;
                    console.log(`Created new user: ${userData.name} (${userData.employee_code})`);
                }
            } catch (userError) {
                console.error(`Error syncing user ${userData.name || userData.employee_code}:`, userError.message);
                errorCount++;
            }
        }

        // Lấy danh sách departments từ Auth Service
        const departmentsResponse = await axios.get('departments', {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const departments = departmentsResponse.data.result || [];
        console.log(`Fetched ${departments.length} departments from Auth Service`);

        // Đồng bộ từng department vào database
        let deptSyncedCount = 0;
        let deptUpdatedCount = 0;
        let deptSkippedCount = 0;
        let deptErrorCount = 0;

        for (const departmentData of departments) {
            try {
                // Kiểm tra department đã tồn tại chưa (dựa trên name)
                const existingDepartment = await Departments.findOne({
                    where: {
                        name: departmentData.name
                    }
                });

                if (existingDepartment) {
                    // Kiểm tra có thay đổi không
                    if (hasDepartmentDataChanged(existingDepartment, departmentData)) {
                        const changedFields = getDepartmentChangedFields(existingDepartment, departmentData);

                        // Cập nhật department hiện tại
                        await existingDepartment.update({
                            description: departmentData.description || '',
                            team_leader: departmentData.team_leader || null,
                            updated_at: new Date()
                        });

                        deptUpdatedCount++;

                        // Optional: Log detailed changes in development
                        if (process.env.NODE_ENV === 'development') {
                            console.log(`Department ${departmentData.name} updated:`, changedFields);
                        }
                    } else {
                        deptSkippedCount++;
                    }
                } else {
                    // Tạo department mới
                    await Departments.create({
                        name: departmentData.name,
                        description: departmentData.description || '',
                        team_leader: departmentData.team_leader || null,
                        created_at: new Date()
                    });
                    deptSyncedCount++;
                    console.log(`Created new department: ${departmentData.name}`);
                }
            } catch (departmentError) {
                console.error(`Error syncing department ${departmentData.name}:`, departmentError.message);
                deptErrorCount++;
            }
        }

        console.log(`User sync completed: ${syncedCount} new users, ${updatedCount} updated users, ${skippedCount} skipped (no changes), ${errorCount} errors`);
        console.log(`Department sync completed: ${deptSyncedCount} new departments, ${deptUpdatedCount} updated departments, ${deptSkippedCount} skipped (no changes), ${deptErrorCount} errors`);

        return {
            success: true,
            token: token,
            stats: {
                users: {
                    total: users.length,
                    created: syncedCount,
                    updated: updatedCount,
                    skipped: skippedCount,
                    errors: errorCount
                },
                departments: {
                    total: departments.length,
                    created: deptSyncedCount,
                    updated: deptUpdatedCount,
                    skipped: deptSkippedCount,
                    errors: deptErrorCount
                }
            }
        };

    } catch (error) {
        console.error("Error during user sync:", error.message);
        if (error.response) {
            console.error("Response data:", error.response.data);
            console.error("Response status:", error.response.status);
        }
        return {
            success: false,
            error: error.message
        };
    }
};



module.exports = syncDatabase;