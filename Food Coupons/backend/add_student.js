const db = require('./db');

const employeeNo = process.argv[2];
const name = process.argv[3] || 'Student';

if (!employeeNo) {
    console.error('Usage: node add_student.js <ID> <Name>');
    process.exit(1);
}

db.db.run("INSERT INTO users (employeeNo, name) VALUES (?, ?)", [employeeNo, name], function(err) {
    if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            console.log(`Student with ID ${employeeNo} already exists. Updating name to ${name}...`);
            db.db.run("UPDATE users SET name = ? WHERE employeeNo = ?", [name, employeeNo]);
        } else {
            console.error('Error:', err.message);
        }
    } else {
        console.log(`Successfully added ${name} with Employee/Student ID: ${employeeNo}`);
    }
    
    // Close DB after a short delay to ensure write
    setTimeout(() => process.exit(0), 500);
});
