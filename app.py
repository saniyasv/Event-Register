from flask import Flask, request, jsonify, render_template
import sqlite3
import os
from datetime import date

app = Flask(__name__)
DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'event_registration.db')


# ─── Database Helpers ────────────────────────────────────────────────────────

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Students (
            student_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            department VARCHAR(50),
            email VARCHAR(100),
            phone VARCHAR(15)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name VARCHAR(100) NOT NULL,
            event_date DATE,
            venue VARCHAR(100),
            organizer VARCHAR(100)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS Registrations (
            registration_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            event_id INTEGER NOT NULL,
            registration_date DATE,
            FOREIGN KEY (student_id) REFERENCES Students(student_id) ON DELETE CASCADE,
            FOREIGN KEY (event_id) REFERENCES Events(event_id) ON DELETE CASCADE
        )
    ''')

    conn.commit()
    conn.close()


# ─── Page Route ──────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


# ─── Stats ───────────────────────────────────────────────────────────────────

@app.route('/api/stats')
def stats():
    conn = get_db()
    students = conn.execute('SELECT COUNT(*) FROM Students').fetchone()[0]
    events = conn.execute('SELECT COUNT(*) FROM Events').fetchone()[0]
    registrations = conn.execute('SELECT COUNT(*) FROM Registrations').fetchone()[0]
    conn.close()
    return jsonify({'students': students, 'events': events, 'registrations': registrations})


# ─── Students CRUD ───────────────────────────────────────────────────────────

@app.route('/api/students', methods=['GET'])
def get_students():
    conn = get_db()
    rows = conn.execute('SELECT * FROM Students ORDER BY student_id DESC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/students', methods=['POST'])
def add_student():
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO Students (name, department, email, phone) VALUES (?, ?, ?, ?)',
        (data['name'], data.get('department', ''), data.get('email', ''), data.get('phone', ''))
    )
    conn.commit()
    student_id = cursor.lastrowid
    conn.close()
    return jsonify({'message': 'Student added successfully', 'student_id': student_id}), 201


@app.route('/api/students/<int:sid>', methods=['PUT'])
def update_student(sid):
    data = request.json
    if not data or not data.get('name'):
        return jsonify({'error': 'Name is required'}), 400
    conn = get_db()
    conn.execute(
        'UPDATE Students SET name=?, department=?, email=?, phone=? WHERE student_id=?',
        (data['name'], data.get('department', ''), data.get('email', ''), data.get('phone', ''), sid)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Student updated successfully'})


@app.route('/api/students/<int:sid>', methods=['DELETE'])
def delete_student(sid):
    conn = get_db()
    conn.execute('DELETE FROM Students WHERE student_id=?', (sid,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Student deleted successfully'})


@app.route('/api/students/<int:sid>/events', methods=['GET'])
def get_student_events(sid):
    conn = get_db()
    rows = conn.execute('''
        SELECT Events.event_id, Events.event_name, Events.event_date, Events.venue,
               Events.organizer, Registrations.registration_date
        FROM Registrations
        JOIN Events ON Registrations.event_id = Events.event_id
        WHERE Registrations.student_id = ?
        ORDER BY Events.event_date DESC
    ''', (sid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ─── Events CRUD ─────────────────────────────────────────────────────────────

@app.route('/api/events', methods=['GET'])
def get_events():
    conn = get_db()
    rows = conn.execute('SELECT * FROM Events ORDER BY event_id DESC').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/events', methods=['POST'])
def add_event():
    data = request.json
    if not data or not data.get('event_name'):
        return jsonify({'error': 'Event name is required'}), 400
    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO Events (event_name, event_date, venue, organizer) VALUES (?, ?, ?, ?)',
        (data['event_name'], data.get('event_date', ''), data.get('venue', ''), data.get('organizer', ''))
    )
    conn.commit()
    event_id = cursor.lastrowid
    conn.close()
    return jsonify({'message': 'Event added successfully', 'event_id': event_id}), 201


@app.route('/api/events/<int:eid>', methods=['PUT'])
def update_event(eid):
    data = request.json
    if not data or not data.get('event_name'):
        return jsonify({'error': 'Event name is required'}), 400
    conn = get_db()
    conn.execute(
        'UPDATE Events SET event_name=?, event_date=?, venue=?, organizer=? WHERE event_id=?',
        (data['event_name'], data.get('event_date', ''), data.get('venue', ''), data.get('organizer', ''), eid)
    )
    conn.commit()
    conn.close()
    return jsonify({'message': 'Event updated successfully'})


@app.route('/api/events/<int:eid>', methods=['DELETE'])
def delete_event(eid):
    conn = get_db()
    conn.execute('DELETE FROM Events WHERE event_id=?', (eid,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Event deleted successfully'})


@app.route('/api/events/<int:eid>/registrations', methods=['GET'])
def get_event_registrations(eid):
    conn = get_db()
    rows = conn.execute('''
        SELECT Students.student_id, Students.name, Students.department,
               Students.email, Registrations.registration_date
        FROM Registrations
        JOIN Students ON Registrations.student_id = Students.student_id
        WHERE Registrations.event_id = ?
        ORDER BY Students.name
    ''', (eid,)).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ─── Registrations ───────────────────────────────────────────────────────────

@app.route('/api/registrations', methods=['GET'])
def get_registrations():
    conn = get_db()
    rows = conn.execute('''
        SELECT Registrations.registration_id, Registrations.registration_date,
               Students.student_id, Students.name AS student_name,
               Events.event_id, Events.event_name
        FROM Registrations
        JOIN Students ON Registrations.student_id = Students.student_id
        JOIN Events ON Registrations.event_id = Events.event_id
        ORDER BY Registrations.registration_id DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route('/api/registrations', methods=['POST'])
def add_registration():
    data = request.json
    if not data or not data.get('student_id') or not data.get('event_id'):
        return jsonify({'error': 'Student and Event are required'}), 400

    conn = get_db()

    # Check for duplicate registration
    existing = conn.execute(
        'SELECT * FROM Registrations WHERE student_id=? AND event_id=?',
        (data['student_id'], data['event_id'])
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({'error': 'Student is already registered for this event'}), 409

    reg_date = data.get('registration_date', str(date.today()))
    cursor = conn.execute(
        'INSERT INTO Registrations (student_id, event_id, registration_date) VALUES (?, ?, ?)',
        (data['student_id'], data['event_id'], reg_date)
    )
    conn.commit()
    reg_id = cursor.lastrowid
    conn.close()
    return jsonify({'message': 'Registration successful', 'registration_id': reg_id}), 201


@app.route('/api/registrations/<int:rid>', methods=['DELETE'])
def delete_registration(rid):
    conn = get_db()
    conn.execute('DELETE FROM Registrations WHERE registration_id=?', (rid,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Registration deleted successfully'})


@app.route('/api/events/student-counts', methods=['GET'])
def event_student_counts():
    conn = get_db()
    rows = conn.execute('''
        SELECT Events.event_name, COUNT(Registrations.student_id) as student_count
        FROM Events
        LEFT JOIN Registrations ON Events.event_id = Registrations.event_id
        GROUP BY Events.event_id, Events.event_name
        ORDER BY student_count DESC
    ''').fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


# ─── Run ─────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    init_db()
    print("Event Registration System running at http://localhost:5000")
    app.run(debug=True, port=5000)
