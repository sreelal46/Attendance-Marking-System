// Application State
let students = [];
let attendanceRecords = [];
let alternativeStudents = [];
let settings = {
    timeThreshold: 48, // Updated to 48 per user request
    timeFormat: 'hms'
};
let reportSettings = {
    batchName: '',
    reportDate: '',
    trainerName: '',
    coordinators: '',
    reportCreator: '',
    tldvLink: '',
    sessionSummary: ''
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadReportSettings();
    loadStudents();
    initializeEventListeners();
    updateStudentList();
    populateReportSettings();
});

// Event Listeners
function initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Student management
    document.getElementById('student-file').addEventListener('change', handleStudentFileUpload);
    document.getElementById('add-student-btn').addEventListener('click', addStudentManually);
    document.getElementById('manual-student-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addStudentManually();
    });
    document.getElementById('clear-students-btn').addEventListener('click', clearAllStudents);

    // Attendance processing
    document.getElementById('attendance-file').addEventListener('change', handleAttendanceFileUpload);

    // Settings
    document.getElementById('save-report-settings-btn').addEventListener('click', saveReportSettings);
    // document.getElementById('time-threshold').value = settings.timeThreshold; // Removed
    // document.getElementById('time-format').value = settings.timeFormat; // Removed allow default hms

    // Export and copy
    document.getElementById('copy-report-btn')?.addEventListener('click', copyFormattedReport);
}

// Tab Switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Student Management - PERMANENT STORAGE (never delete)
function handleStudentFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
        parseCSVFile(file, processStudentData);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        parseExcelFile(file, processStudentData);
    } else {
        showStatus('processing-status', 'Unsupported file format. Please upload CSV or Excel file.', 'error');
    }
}

function processStudentData(data) {
    // Skip Google Meet header rows (rows starting with *)
    let headerRowIndex = 0;
    for (let i = 0; i < data.length; i++) {
        const firstCell = (data[i][0] || '').toString().trim();
        if (!firstCell.startsWith('*') && firstCell !== '') {
            headerRowIndex = i;
            break;
        }
    }

    const headers = data[headerRowIndex];
    const nameColumn = findColumn(headers, ['full name', 'name', 'student name', 'student']);

    if (nameColumn === null) {
        alert('Could not find a "Name", "Student Name", or "Full Name" column in the file.');
        return;
    }

    const newStudents = data.slice(headerRowIndex + 1)
        .map(row => row[nameColumn])
        .filter(name => name && name.trim() !== '' && !name.toString().includes('AI Notetaker'));

    // Add only new students (permanent - never delete existing)
    newStudents.forEach(name => {
        const cleanName = cleanStudentName(name);
        if (!students.includes(cleanName)) {
            students.push(cleanName);
        }
    });

    saveStudents();
    updateStudentList();
    showStatus('processing-status', `Successfully added ${newStudents.length} students! (Total: ${students.length})`, 'success');
}

function addStudentManually() {
    const input = document.getElementById('manual-student-name');
    const name = input.value.trim();

    if (name === '') {
        alert('Please enter a student name.');
        return;
    }

    const cleanName = cleanStudentName(name);

    if (students.includes(cleanName)) {
        alert('Student already exists in the list.');
        return;
    }

    students.push(cleanName);
    saveStudents();
    updateStudentList();
    input.value = '';
}

function removeStudent(name) {
    if (confirm('Are you sure you want to remove this student? This action cannot be undone.')) {
        students = students.filter(s => s !== name);
        saveStudents();
        updateStudentList();
    }
}

function clearAllStudents() {
    if (confirm('⚠️ WARNING: This will permanently delete ALL students from the list. Are you absolutely sure?')) {
        students = [];
        saveStudents();
        updateStudentList();
    }
}

function updateStudentList() {
    const listContainer = document.getElementById('student-list');
    const countElement = document.getElementById('student-count');

    countElement.textContent = students.length;

    if (students.length === 0) {
        listContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No students added yet.</p>';
        return;
    }

    // Sort students alphabetically
    const sortedStudents = [...students].sort();

    listContainer.innerHTML = sortedStudents.map(student => `
        <div class="student-item">
            <span>${student}</span>
            <button class="remove-btn" onclick="removeStudent('${student.replace(/'/g, "\\'")}')">Remove</button>
        </div>
    `).join('');
}

// Clean student name (remove batch codes like BCR78)
function cleanStudentName(name) {
    // Remove common batch patterns and trim
    const cleaned = name
        .replace(/\(?\s*(BCR|CMBCR)\s*\d+\s*\)?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    // Normalize to title case for consistent matching
    return toTitleCase(cleaned);
}

// Normalize name for matching (lowercase, common variations, and suffix handling)
function normalizeForMatching(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/\s+cm\b/g, '')              // Remove " cm" as a suffix (common user pattern)
        .replace(/mohammed/g, 'muhammed')     // Standardize spelling
        .replace(/mohammad/g, 'muhammed')
        .replace(/muhammad/g, 'muhammed')
        .replace(/\s+/g, '')                  // Remove all remaining spaces
        .trim();
}

// Convert to title case for consistent name matching
function toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
}

// Extract batch code from student name
function extractBatchCode(name) {
    // More aggressive match for batch code even if attached to name
    const match = name.match(/(BCR|CMBCR)\s*\d+/i);
    if (match) {
        // Normalize: remove spaces, convert to uppercase, strip 'CM' to get core batch
        return match[0].replace(/\s/g, '').toUpperCase().replace(/^CM/, '');
    }
    return null;
}

// Check if student belongs to the specified batch
function matchesBatch(studentName, targetBatch) {
    if (!targetBatch || targetBatch.trim() === '') {
        return true; // No batch filter, include all
    }

    const studentBatch = extractBatchCode(studentName);
    if (!studentBatch) {
        return false; // Student has no batch code
    }

    // Normalize target batch (remove spaces, parentheses, uppercase, strip 'CM')
    const normalizedTarget = targetBatch.replace(/[\s()]/g, '').toUpperCase().replace(/^CM/, '');

    // Allow partial match (e.g. BCR78 matches CMBCR78 after normalization)
    return studentBatch === normalizedTarget || studentBatch.includes(normalizedTarget) || normalizedTarget.includes(studentBatch);
}

// Attendance Processing
function handleAttendanceFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('processing-status');
    statusDiv.style.display = 'block';
    statusDiv.textContent = 'Processing file...';
    statusDiv.className = 'status-message';

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'csv') {
        parseCSVFile(file, processAttendanceData);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        parseExcelFile(file, processAttendanceData);
    } else {
        showStatus('processing-status', 'Unsupported file format. Please upload CSV or Excel file.', 'error');
    }
}

function processAttendanceData(data) {
    // Skip Google Meet header rows (rows starting with *)
    let headerRowIndex = 0;
    for (let i = 0; i < data.length; i++) {
        const firstCell = (data[i][0] || '').toString().trim();
        if (!firstCell.startsWith('*') && firstCell !== '') {
            headerRowIndex = i;
            break;
        }
    }

    const headers = data[headerRowIndex];
    const nameColumn = findColumn(headers, ['full name', 'name', 'student name', 'student']);
    const timeColumn = findColumn(headers, ['time in call', 'time', 'duration', 'call time', 'call duration']);

    if (nameColumn === null || timeColumn === null) {
        showStatus('processing-status', 'Could not find required columns. Looking for "Full Name" and "Time in Call".', 'error');
        return;
    }

    alternativeStudents = []; // Reset alternative students
    let filteredCount = 0;
    let totalCount = 0;

    attendanceRecords = data.slice(headerRowIndex + 1).map(row => {
        const fullName = row[nameColumn];
        const timeValue = row[timeColumn];

        // Skip empty rows and AI notetakers
        if (!fullName || fullName.toString().includes('AI Notetaker') || fullName.toString().includes('tldv.io')) {
            return null;
        }

        totalCount++;

        // Batch filtering removed as per user request
        // if (!matchesBatch(fullName, reportSettings.batchName)) {
        //    filteredCount++;
        //    return null; 
        // }

        const cleanName = cleanStudentName(fullName);
        const normalizedCleanName = normalizeForMatching(cleanName);

        // Filter out Trainer if name matches
        if (reportSettings.trainerName) {
            const normalizedTrainer = normalizeForMatching(reportSettings.trainerName);
            if (normalizedCleanName === normalizedTrainer || normalizeForMatching(fullName) === normalizedTrainer) {
                return null;
            }
        }

        const minutes = parseTimeToMinutes(timeValue);
        const status = minutes >= settings.timeThreshold ? 'Present' : 'Absent';

        // Check if student is in the main list or is alternative
        // Use space-insensitive matching
        const studentFromList = students.find(s => normalizeForMatching(s) === normalizedCleanName);
        const isAlternative = !studentFromList;

        // Use the official name from the list if found, otherwise the cleaned name
        const displayName = studentFromList || cleanName;

        if (isAlternative && status === 'Present') {
            alternativeStudents.push({
                cleanName: cleanName,
                originalName: fullName  // Keep original name with batch code
            });
        }

        return {
            name: displayName,
            originalName: fullName,
            time: timeValue,
            minutes: minutes,
            status: status,
            isAlternative: isAlternative
        };
    }).filter(record => record !== null);

    displayAttendanceResults();

    let statusMessage = 'Attendance processed successfully!';
    // if (reportSettings.batchName && filteredCount > 0) {
    //     statusMessage += ` (Filtered ${filteredCount} students from other batches. Showing only ${reportSettings.batchName} batch.)`;
    // }
    showStatus('processing-status', statusMessage, 'success');
}

function parseTimeToMinutes(timeValue) {
    if (!timeValue) return 0;

    const timeStr = timeValue.toString().trim();

    // If it's already a number (minutes)
    if (!isNaN(timeStr)) {
        return parseFloat(timeStr);
    }

    // Parse HH:MM:SS or MM:SS format
    const parts = timeStr.split(':');

    if (parts.length === 3) {
        // HH:MM:SS
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const seconds = parseInt(parts[2]) || 0;
        return hours * 60 + minutes + seconds / 60;
    } else if (parts.length === 2) {
        // MM:SS
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        return minutes + seconds / 60;
    }

    return 0;
}

function displayAttendanceResults() {
    const resultsDiv = document.getElementById('attendance-results');
    resultsDiv.style.display = 'block';

    const presentCount = attendanceRecords.filter(r => r.status === 'Present').length;
    const absentCount = attendanceRecords.filter(r => r.status === 'Absent').length;

    document.getElementById('present-count').textContent = presentCount;
    document.getElementById('absent-count').textContent = absentCount;
    document.getElementById('total-count').textContent = attendanceRecords.length;

    const tableContainer = document.getElementById('results-table-container');

    // SIMPLIFIED VIEW FOR > 40 STUDENTS
    if (attendanceRecords.length > 40) {
        // Create a map of present students (normalized names) for fast lookup of details
        const presentMap = new Map();
        attendanceRecords.forEach(r => {
            if (r.status === 'Present') {
                presentMap.set(normalizeForMatching(r.name), r);
            }
        });

        // Map main list students to status requesting details
        // WE ONLY SHOW MAIN LIST STUDENTS as requested
        const simplifiedRows = students.map(studentName => {
            const cleanName = cleanStudentName(studentName);
            const normalizedName = normalizeForMatching(cleanName);
            const record = presentMap.get(normalizedName);
            const isPresent = !!record;

            return {
                name: studentName,
                time: isPresent ? record.time : '-',
                minutes: isPresent ? record.minutes : 0,
                status: isPresent ? 'Present' : 'Absent'
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        tableContainer.innerHTML = `
            <div class="alert-info" style="background: var(--bg-secondary); padding: 10px; margin-bottom: 10px; border-radius: 6px; font-size: 0.9em;">
                ℹ️ Large class detected (>40). Showing simplified status for Main List students only.
            </div>
            <table class="results-table">
                <thead>
                    <tr>
                        <th>Student Name</th>
                        <th>Time in Call</th>
                        <th>Minutes</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${simplifiedRows.map(row => `
                        <tr class="${row.status.toLowerCase()}">
                            <td data-label="Student Name">${row.name}</td>
                             <td data-label="Time in Call">${row.time}</td>
                            <td data-label="Minutes">${row.minutes > 0 ? row.minutes.toFixed(2) : '-'}</td>
                            <td data-label="Status">
                                <span class="status-badge ${row.status.toLowerCase()}">${row.status}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        return;
    }

    // DETAILED VIEW (<= 40 STUDENTS)
    tableContainer.innerHTML = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Student Name</th>
                    <th>Time in Call</th>
                    <th>Minutes</th>
                    <th>Status</th>
                    <th>Type</th>
                </tr>
            </thead>
            <tbody>
                ${attendanceRecords.map(record => `
                    <tr>
                        <td data-label="Student Name">${record.name}</td>
                        <td data-label="Time in Call">${record.time}</td>
                        <td data-label="Minutes">${record.minutes.toFixed(2)}</td>
                        <td data-label="Status"><span class="status-badge ${record.status.toLowerCase()}">${record.status}</span></td>
                        <td data-label="Type">${record.isAlternative ? '<span style="color: var(--warning);">⚠️ Alternative</span>' : '✓ Regular'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Generate Formatted Report
function generateFormattedReport() {
    // Update reportSettings from DOM for fields that were moved to Attendance tab
    reportSettings.reportDate = document.getElementById('report-date').value;
    reportSettings.sessionSummary = document.getElementById('session-summary').value;
    reportSettings.tldvLink = document.getElementById('tldv-link').value;

    // Auto-save these to localStorage when generating report
    localStorage.setItem('reportSettings', JSON.stringify(reportSettings));

    const presentStudents = attendanceRecords
        .filter(r => r.status === 'Present' && !r.isAlternative)
        .map(r => r.name);

    const absentStudents = students.filter(s =>
        !attendanceRecords.some(r => r.name === s && r.status === 'Present')
    );

    // Format date
    const dateObj = reportSettings.reportDate ? new Date(reportSettings.reportDate + 'T00:00:00') : new Date();
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;

    // Clean minimal report format optimized for WhatsApp
    let report = `🗒 Session Report\n\n`;

    if (reportSettings.batchName) report += `Batch: ${reportSettings.batchName}\n`;
    report += `Date: ${formattedDate}\n`;
    // Trainer name removed from report as per user request, but kept in settings for filtering
    if (reportSettings.coordinators) report += `Coordinators: ${reportSettings.coordinators}\n`;
    if (reportSettings.reportCreator) report += `Report by: ${reportSettings.reportCreator}\n`;

    if (reportSettings.tldvLink) {
        report += `\n\n🎥 TL;DV:\n${reportSettings.tldvLink}`;
    }

    if (reportSettings.sessionSummary) {
        report += `\n\n\n📝 Today's Session Summary:\n\n${reportSettings.sessionSummary}`;
    }

    report += `\n\n\n👥 Participants Present:\n\n`;
    presentStudents.forEach((student, index) => {
        report += `${index + 1}. ${student}\n`;
    });

    // Only show alternative students if total attendance records is <= 40
    if (alternativeStudents.length > 0 && attendanceRecords.length <= 40) {
        const totalAttendance = presentStudents.length + alternativeStudents.length;
        const showBatchCodes = totalAttendance < 40; // Show batch codes if attendance is low

        report += `\n\n⚠️ Alternative Students (Not in Main List):\n\n`;
        alternativeStudents.forEach((student, index) => {
            // Show original name with batch code if attendance is low, otherwise clean name
            const displayName = showBatchCodes ? student.originalName : student.cleanName;
            report += `${index + 1}. ${displayName}\n`;
        });
    }

    report += `\n\n\n❌ Absentees:\n\n`;
    absentStudents.forEach((student, index) => {
        report += `${index + 1}. ${student}\n`;
    });

    return report;
}

function copyFormattedReport() {
    const report = generateFormattedReport();

    navigator.clipboard.writeText(report).then(() => {
        alert('✅ Report copied to clipboard! You can now paste it anywhere.');
    }).catch(err => {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = report;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('✅ Report copied to clipboard!');
    });
}

// File Parsing
function parseCSVFile(file, callback) {
    Papa.parse(file, {
        complete: (results) => {
            callback(results.data);
        },
        error: (error) => {
            alert('Error parsing CSV file: ' + error.message);
        }
    });
}

function parseExcelFile(file, callback) {
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
            callback(jsonData);
        } catch (error) {
            alert('Error parsing Excel file: ' + error.message);
        }
    };

    reader.readAsArrayBuffer(file);
}

// Utility Functions
function findColumn(headers, possibleNames) {
    const lowerHeaders = headers.map(h => (h || '').toString().toLowerCase().trim());

    for (let name of possibleNames) {
        const index = lowerHeaders.indexOf(name.toLowerCase());
        if (index !== -1) return index;
    }

    return null;
}

function showStatus(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Settings Management
function saveSettings() {
    // settings.timeThreshold = parseInt(document.getElementById('time-threshold').value); // Removed
    // settings.timeFormat = document.getElementById('time-format').value; // Removed

    // Nothing to save for now regarding time, but keeping function structure if needed later
    // localStorage.setItem('attendanceSettings', JSON.stringify(settings));
    // showStatus('settings-status', 'Attendance settings saved successfully!', 'success');
}

function loadSettings() {
    const saved = localStorage.getItem('attendanceSettings');
    if (saved) {
        settings = JSON.parse(saved);
    }
}

function saveReportSettings() {
    reportSettings.batchName = document.getElementById('batch-name').value;
    reportSettings.reportDate = document.getElementById('report-date').value;
    reportSettings.trainerName = document.getElementById('trainer-name').value;
    reportSettings.coordinators = document.getElementById('coordinator-names').value;
    reportSettings.reportCreator = document.getElementById('report-creator').value;
    reportSettings.tldvLink = document.getElementById('tldv-link').value;
    reportSettings.sessionSummary = document.getElementById('session-summary').value;

    localStorage.setItem('reportSettings', JSON.stringify(reportSettings));
    showStatus('report-settings-status', 'Report settings saved successfully!', 'success');
}

function loadReportSettings() {
    const saved = localStorage.getItem('reportSettings');
    if (saved) {
        reportSettings = JSON.parse(saved);
    }
}

function populateReportSettings() {
    document.getElementById('batch-name').value = reportSettings.batchName || '';
    document.getElementById('batch-name').value = reportSettings.batchName || '';

    // Set default date to today if not set
    if (!reportSettings.reportDate) {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('report-date').value = today;
    } else {
        document.getElementById('report-date').value = reportSettings.reportDate;
    }

    document.getElementById('trainer-name').value = reportSettings.trainerName || '';
    document.getElementById('coordinator-names').value = reportSettings.coordinators || '';
    document.getElementById('report-creator').value = reportSettings.reportCreator || '';
    document.getElementById('tldv-link').value = reportSettings.tldvLink || '';
    document.getElementById('session-summary').value = reportSettings.sessionSummary || '';
}

// Student Persistence
function saveStudents() {
    localStorage.setItem('students', JSON.stringify(students));
}

function loadStudents() {
    const saved = localStorage.getItem('students');
    if (saved) {
        students = JSON.parse(saved);
    }
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}
