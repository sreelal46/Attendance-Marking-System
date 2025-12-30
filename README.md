# Attendance Marking System

A web-based attendance tracking system that automatically marks students as present or absent based on their call duration.

## Features

- **Student Management**: Upload student lists via CSV/Excel or add manually
- **Automated Attendance**: Upload attendance documents and automatically mark present/absent
- **Customizable Rules**: Set your own time threshold (default: 50 minutes)
- **Multiple Formats**: Supports CSV and Excel files (.xlsx, .xls)
- **Time Format Flexibility**: Handles minutes, HH:MM:SS, or MM:SS formats
- **Export Reports**: Download attendance reports as CSV
- **Data Persistence**: Student lists and settings are saved locally

## How to Use

### 1. Add Students
- Go to the **Students** tab
- Upload a CSV/Excel file with a "Name" column, OR
- Add students manually using the input field

### 2. Configure Settings (Optional)
- Go to the **Settings** tab
- Set the minimum time threshold for marking present (default: 50 minutes)
- Choose the time format used in your attendance files
- Click "Save Settings"

### 3. Mark Attendance
- Go to the **Mark Attendance** tab
- Upload a CSV/Excel file with:
  - A "Name" column (student names)
  - A "Time" or "Time in Call" column (duration in minutes or time format)
- The system will automatically process and display results

### 4. View Results
- See statistics: Present, Absent, and Total counts
- View detailed table with each student's status
- Export results to CSV for record-keeping

## File Format Examples

### Student List (CSV)
```
Name
John Doe
Jane Smith
Michael Johnson
```

### Attendance Document (CSV)
```
Name,Time in Call
John Doe,55
Jane Smith,45
Michael Johnson,62
```

Or with time format:
```
Name,Time in Call
John Doe,00:55:30
Jane Smith,00:45:20
Michael Johnson,01:02:15
```

## Sample Files

Sample files are included in the project:
- `students.csv` - Example student list
- `attendance.csv` - Example attendance data


## Technical Details

- Built with vanilla HTML, CSS, and JavaScript
- Uses PapaParse for CSV parsing
- Uses SheetJS (xlsx) for Excel file support
- Data stored in browser's localStorage
- No server required - runs entirely in the browser

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Getting Started

Simply open `index.html` in your web browser. No installation or setup required!
