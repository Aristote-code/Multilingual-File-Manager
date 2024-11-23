const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api';
let authToken = '';
let uploadedFileId = '';
let taskId = '';

// Test user credentials
const testUser = {
    username: 'testuser' + Date.now(), // Make username unique
    email: `test${Date.now()}@example.com`, // Make email unique
    password: 'password123',
    preferredLanguage: 'en'
};

async function runTests() {
    try {
        // 1. Register user
        console.log('\n1. Testing user registration...');
        const registerResponse = await axios.post(`${API_URL}/users/register`, testUser);
        console.log('✅ User registration successful');
        console.log('User ID:', registerResponse.data.user.id);

        // 2. Login
        console.log('\n2. Testing login...');
        const loginResponse = await axios.post(`${API_URL}/users/login`, {
            email: testUser.email,
            password: testUser.password
        });
        authToken = loginResponse.data.token;
        console.log('✅ Login successful');
        console.log('Auth Token:', authToken.substring(0, 20) + '...');

        // 3. Upload file
        console.log('\n3. Testing file upload...');
        const formData = new FormData();
        const testFile = path.join(__dirname, 'test.txt');
        // Create a test file
        fs.writeFileSync(testFile, 'This is a test file');
        formData.append('file', fs.createReadStream(testFile));

        const uploadResponse = await axios.post(`${API_URL}/files/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${authToken}`
            }
        });
        
        if (uploadResponse.data.taskId) {
            taskId = uploadResponse.data.taskId;
            console.log('✅ Large file upload queued successfully');
            console.log('Task ID:', taskId);
            
            // Check progress
            console.log('\n4. Testing progress checking...');
            let progress = 0;
            while (progress < 100) {
                const progressResponse = await axios.get(`${API_URL}/files/progress/${taskId}`, {
                    headers: { Authorization: `Bearer ${authToken}` }
                });
                progress = progressResponse.data.progress;
                console.log(`Progress: ${progress}%`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            uploadedFileId = uploadResponse.data.file._id;
            console.log('✅ File upload successful');
            console.log('File ID:', uploadedFileId);
        }

        // 5. List files
        console.log('\n5. Testing file listing...');
        const listResponse = await axios.get(`${API_URL}/files`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ File listing successful');
        console.log('Files found:', listResponse.data.length);

        // 6. Search files
        console.log('\n6. Testing file search...');
        const searchResponse = await axios.get(`${API_URL}/files/search?query=test`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ File search successful');
        console.log('Search results:', searchResponse.data.length);

        // 7. Download file
        console.log('\n7. Testing file download...');
        const downloadResponse = await axios.get(`${API_URL}/files/${uploadedFileId}/download`, {
            headers: { Authorization: `Bearer ${authToken}` },
            responseType: 'stream'
        });
        const downloadPath = path.join(__dirname, 'downloaded_test.txt');
        downloadResponse.data.pipe(fs.createWriteStream(downloadPath));
        console.log('✅ File download successful');
        console.log('Downloaded to:', downloadPath);

        // 8. Clean up
        console.log('\n8. Testing file deletion...');
        console.log('Attempting to delete file ID:', uploadedFileId);
        const deleteResponse = await axios.delete(`${API_URL}/files/${uploadedFileId}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('✅ File deletion successful');
        console.log('Delete response:', deleteResponse.data);

        // Clean up test files
        try {
            fs.unlinkSync(testFile);
            fs.unlinkSync(downloadPath);
            console.log('Test files cleaned up successfully');
        } catch (err) {
            console.warn('Warning: Error cleaning up test files:', err.message);
        }

        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('\n❌ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received:', error.request);
        } else {
            console.error('Error:', error.message);
        }
        console.error('Error config:', error.config);
    }
}

// Run the tests
runTests();