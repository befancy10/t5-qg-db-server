const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5173', 
        'https://your-frontend-domain.vercel.app', // Ganti dengan domain Vercel Anda nanti
        'https://*.vercel.app' // Allows all Vercel subdomains
    ],
    credentials: true
}));

// Database Connection
const connection = mysql.createConnection({
    host: process.env.MYSQLHOST || 'localhost',
    user: process.env.MYSQLUSER || 'website_user', 
    password: process.env.MYSQLPASSWORD || 'Surabaya!123',
    database: process.env.MYSQLDATABASE || 'crossword_db',
    port: process.env.MYSQLPORT || 3306,
    // Tambahan untuk koneksi yang lebih stabil
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
});

// Debug Database Configuration
console.log('=== DATABASE CONFIGURATION ===');
console.log('Host:', process.env.MYSQLHOST || 'localhost');
console.log('User:', process.env.MYSQLUSER || 'website_user');
console.log('Database:', process.env.MYSQLDATABASE || 'crossword_db');
console.log('Port:', process.env.MYSQLPORT || 3306);

// Validate Required Environment Variables
if (!process.env.MYSQLHOST || !process.env.MYSQLUSER || !process.env.MYSQLPASSWORD) {
    console.error('Missing required MySQL environment variables!');
    console.error('Required: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE');
    console.error('Make sure MySQL service is added to Railway project and variables are linked');
}

// Connect to MySQL with retry logic
const connectWithRetry = () => {
    connection.connect(err => {
        if (err) {
            console.error('Error connecting to database:', err.code);
            console.error('Error message:', err.message);
            console.error('Retrying in 5 seconds...');
            setTimeout(connectWithRetry, 5000);
            return;
        }
        console.log('Connected to Railway MySQL database as id', connection.threadId);
    });
};

connectWithRetry();

// Table Creation Queries
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS imported_crosswords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    crosswordData TEXT,
    questions TEXT,
    answers TEXT,
    passage TEXT,
    generatedKey VARCHAR(255) UNIQUE
);
`;

const createTableQueryStudent = `
    CREATE TABLE IF NOT EXISTS crossword_leaderboard (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    time_taken FLOAT DEFAULT 0.0,
    generatedKey VARCHAR(255),
    CONSTRAINT FK_generatedKey FOREIGN KEY (generatedKey)
        REFERENCES imported_crosswords(generatedKey)
);
`;

const createMCQTable = `
CREATE TABLE IF NOT EXISTS imported_mcqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    questions TEXT,
    options TEXT,
    correct_answers TEXT,
    passage TEXT,
    generatedKey VARCHAR(255) UNIQUE
);
`;

const createMCQLeaderboard = `
CREATE TABLE IF NOT EXISTS mcq_leaderboard (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    score INT DEFAULT 0,
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    time_taken FLOAT DEFAULT 0.0,
    generatedKey VARCHAR(255),
    CONSTRAINT FK_mcqKey FOREIGN KEY (generatedKey)
        REFERENCES imported_mcqs(generatedKey)
);
`;

// Create Tables
connection.query(createTableQuery, (error, results, fields) => {
  if (error) {
      console.error('Error creating table:', error);
      return;
  }
  console.log('imported_crosswords Table created successfully or already exists.');
});

connection.query(createTableQueryStudent, (error, results, fields) => {
if (error) {
    console.error('Error creating table:', error);
    return;
}
console.log('crossword_leaderboard Table created successfully or already exists.');
});

connection.query(createMCQTable, (error, results, fields) => {
    if (error) {
        console.error('Error creating MCQ table:', error);
        return;
    }
    console.log('imported_mcqs Table created or already exists.');
});

connection.query(createMCQLeaderboard, (error, results, fields) => {
    if (error) {
        console.error('Error creating MCQ leaderboard:', error);
        return;
    }
    console.log('mcq_leaderboard Table created or already exists.');
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Elementary Quiz Generator API is running',
        timestamp: new Date().toISOString(),
        database: connection.state
    });
});

// Root endpoint (untuk testing)
app.get('/', (req, res) => {
    res.json({ 
        message: 'Elementary Quiz Generator API',
        description: 'T5-based Question Generation for English Grade 3-4',
        version: '1.0.0',
        endpoints: {
            crosswords: '/check-key/:key',
            mcq: '/check-mcq/:key',
            leaderboard: '/leaderboard/:key',
            health: '/health'
        }
    });
});

// API - Crossword Export to DB
app.post('/display_question_answer', (req, res) => {
    const { crosswordData, questions, answers, passage, generatedKey } = req.body;

    console.log("Received crossword data:", crosswordData);
    console.log("Received questions:", questions);
    console.log("Received answers:", answers);
    console.log("Received passage:", passage);
    console.log("Received key:", generatedKey);

    const crosswordDataJson = JSON.stringify(crosswordData);
    const questionsJson = JSON.stringify(questions);
    const answersJson = JSON.stringify(answers);

    const dataToInsert = {
        crosswordData: crosswordDataJson,
        questions: questionsJson,
        answers: answersJson,
        passage: passage,
        generatedKey: generatedKey
    };

    console.log("Data to insert:", dataToInsert);

    connection.query('INSERT INTO imported_crosswords SET ?', dataToInsert, (error, results, fields) => {
        if (error) {
            console.error('Error inserting crossword data:', error);
            return res.status(500).json({ error: 'Failed to insert crossword data', mysqlError: error });
        }
        console.log('Inserted crossword data into MySQL successfully.');
        res.json({ message: 'Crossword data inserted into MySQL successfully' });
    });
});

// API - MCQ Export to DB
app.post('/export_mcq_data', (req, res) => {
  const { questions, options, correct_answers, passage, generatedKey } = req.body;
  
  console.log("Received questions:", questions);
  console.log("Received options:", options);
  console.log("Received correct answers:", correct_answers);
  console.log("Received passage:", passage);
  console.log("Received key:", generatedKey);
  
  const questionsJson = JSON.stringify(questions);
  const optionsJson = JSON.stringify(options);
  const correct_answersJson = JSON.stringify(correct_answers);
  
  const dataToInsert = {
    questions: questionsJson,
    options: optionsJson,
    correct_answers: correct_answersJson,
    passage: passage,
    generatedKey: generatedKey
  };
  
  console.log("Data to insert:", dataToInsert);
  
  connection.query('INSERT INTO imported_mcqs SET ?', dataToInsert, (error, results) => {
    if (error) {
      console.error('Error inserting mcq data:', error);
      return res.status(500).json({ error: 'Error saving MCQ', mysqlError: error });
    }
    console.log('Inserted mcq data into MySQL successfully.');
    res.json({ message: 'MCQ saved successfully' });
  });
});

// Key & Name Check Routes
app.get('/check-key/:key', (req, res) => {
  const key = req.params.key;

  const sql = 'SELECT * FROM imported_crosswords WHERE generatedKey = ?';
  connection.query(sql, [key], (error, results) => {
    if (error) {
      console.error('Error querying database:', error);
      res.status(500).json({ error: 'Error querying database' });
      return;
    }

    if (results.length > 0) {
      const crosswordData = results[0].crosswordData;
      const questions = results[0].questions;
      const answers = results[0].answers;
      const passage = results[0].passage;
      res.json({
        found: true,
        crosswordData: crosswordData,
        questions: questions,
        answers: answers,
        passage: passage
      });
    } else {
      res.json({ found: false });
    }
  });
});

// Ambil MCQ berdasarkan kode unik 
app.get('/check-mcq/:key', (req, res) => {
  const key = req.params.key;

  const sql = 'SELECT * FROM imported_mcqs WHERE generatedKey = ?';
  connection.query(sql, [key], (error, results) => {
      if (error) {
        console.error('Error querying database:', error);
        return res.status(500).json({ error: 'MCQ not found' });
      }

      if (results.length > 0) {
        const questions = results[0].questions;
        const options = results[0].options;
        const correct_answers = results[0].correct_answers;
        const passage = results[0].passage;

        res.json({
            found: true,
            questions: questions,
            options: options,
            correct_answers: correct_answers,
            passage: passage
        });
      } else {
        res.json({ found: false });
      }
  });
});

app.get('/check-name/:name/:key', (req, res) => {
  const name = req.params.name;
  const key = req.params.key;
  const sql = 'SELECT * FROM crossword_leaderboard WHERE name = ? AND generatedKey = ?';

  connection.query(sql, [name, key], (error, results) => {
    if (error) {
      console.error('Error querying database:', error);
      res.status(500).json({ error: 'Error querying Crossword name and key' });
      return;
    }

    if (results.length > 0) {
      const name = results[0].name;
      const key = results[0].key;
      const is_done = results[0].is_done;
      res.json({
        found: true,
        name: name,
        key: key,
        is_done: is_done
      });
    } else {
      res.json({ found: false });
    }
  });
});

// Check MCQ status: is student done?
app.get('/check-mcq-name/:name/:key', (req, res) => {
  const name = req.params.name;
  const key = req.params.key;
  const sql = 'SELECT * FROM mcq_leaderboard WHERE name = ? AND generatedKey = ?';

  connection.query(sql, [name, key], (error, results) => {
    if (error) {
      console.error('Error querying database:', error);
      return res.status(500).json({ error: 'Error querying MCQ name and key' });
    }

    if (results.length > 0) {
      const name = results[0].name;
      const key = results[0].key;
      const is_done = results[0].is_done;
      res.json({ 
        found: true, 
        name, 
        key: key, 
        is_done 
      });
    } else {
      res.json({ found: false });
    }
  });
});

app.get('/get-name/:name', (req, res) => {
  const name = req.params.name;

  const query = 'SELECT * FROM crossword_leaderboard WHERE name = ?';
  connection.query(query, [name], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      res.status(500).json({ error: 'Error querying database' });
      return;
    }

    if (results.length > 0) {
      const name = results[0].name;
      const key = results[0].key;
      res.json({
        found: true,
        name: name,
        key: key
      });
    } else {
      res.json({ found: false });
    }
  });
});

app.get('/get-mcq-name/:name', (req, res) => {
  const name = req.params.name;

  const query = 'SELECT * FROM mcq_leaderboard WHERE name = ?';
  connection.query(query, [name], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      res.status(500).json({ error: 'Error querying database' });
      return;
    }

    if (results.length > 0) {
      const name = results[0].name;
      const key = results[0].key;
      res.json({
        found: true,
        name: name,
        key: key
      });
    } else {
      res.json({ found: false });
    }
  });
});

app.post('/save-name', (req, res) => {
  const { name, key } = req.body;

  console.log('Received data:', { name, key });

  if (!name || !key) {
    console.error('Invalid data received');
    return res.status(400).json({ error: 'Invalid data received' });
  }

  const queryStoreName = 'INSERT INTO crossword_leaderboard (name, generatedKey) VALUES (?, ?)';
  connection.query(queryStoreName, [name, key], (err, results) => {
    if (err) {
      console.error('Error saving user name:', err);
      return res.status(500).json({ error: 'Failed to save user name', mysqlError: err });
    }

    res.json({ message: 'User name saved', id: results.insertId });
  });
});

app.post('/save-mcq-name', (req, res) => {
  const { name, key } = req.body;

  console.log('Received MCQ data:', { name, key });

  if (!name || !key) {
    console.error('Invalid MCQ data received');
    return res.status(400).json({ error: 'Invalid MCQ data received' });
  }

  const query = 'INSERT INTO mcq_leaderboard (name, generatedKey) VALUES (?, ?)';
  connection.query(query, [name, key], (err, results) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        console.warn('Duplicate entry attempted:', { name, key });
        return res.status(200).json({ message: 'Already exists' });
      }
      console.error('Error saving MCQ user name:', err);
      return res.status(500).json({ error: 'Failed to save MCQ user name', mysqlError: err });
    }

    res.json({ message: 'MCQ user name saved', name, key });
  });
});

// Leaderboard Routes
app.get('/leaderboard/:key', (req, res) => {
  const key = req.params.key;

  const sql = `
    SELECT * 
    FROM crossword_leaderboard 
    WHERE generatedKey = ? 
    ORDER BY CASE WHEN time_taken = 0 THEN 1 ELSE 0 END, time_taken;
  `;
  connection.query(sql, [key], (err, results) => {
    if (err) {
      console.error('Error querying database:', err);
      res.status(500).json({ error: 'Error querying database' });
      return;
    }

    if (results.length > 0) {
      const leaderboard = results.map(row => ({
        name: row.name,
        is_done: row.is_done,
        time_taken: row.time_taken
      }));
      res.json({
        found: true,
        leaderboard: leaderboard
      });
    } else {
      res.json({ found: false });
    }
  });
});

app.get('/leaderboard-mcq/:key', (req, res) => {
  const key = req.params.key;
  const sql = `
      SELECT * FROM mcq_leaderboard
      WHERE generatedKey = ?
      ORDER BY score DESC
  `;
  connection.query(sql, [key], (err, results) => {
      if (err) {
        console.error('Error querying database:', err);
        return res.status(500).json({ error: 'Error querying database' });
      } 
      if (results.length > 0) {
        const leaderboard = results.map(row => ({
          name: row.name,
          score: row.score,
          is_done: row.is_done,
          time_taken: row.time_taken
        }));
        res.json({
          found: true,
          leaderboard: leaderboard
        });
      } else {
        res.json({ found: false });
      }
  });
});

// Update Results
app.post("/update-is-done", (req, res) => {
  const { key, name, time } = req.body;
  
  console.log("Received key:", key);
  console.log("Received name:", name);
  console.log("Received time:", time);

  const sql =`
    UPDATE crossword_leaderboard 
    SET is_done = 1, time_taken = ? 
    WHERE generatedKey = ? AND name = ?
    `;

  connection.query(sql, [time, key, name], (err, result) => {
    if (err) {
      console.error("Error updating is_done:", err);
      res.status(500).json({ error: "Error updating is_done" });
      return;
    }

    res.json({ success: true });
  });
});

app.post('/update-mcq-result', (req, res) => {
  const { name, score, time, key  } = req.body;

  if (!name || !key || score == null || time == null) {
    return res.status(400).json({ error: 'Incomplete data for MCQ update' });
  }

  console.log("Received key:", key);
  console.log("Received name:", name);
  console.log("Received score:", score);
  console.log("Received time:", time);

  const sql = `
    UPDATE mcq_leaderboard 
    SET score = ?, time_taken = ?, is_done = true 
    WHERE name = ? AND generatedKey = ?
  `;

  connection.query(sql, [score, time, name, key], (err, result) => {
    if (err) {
      console.error('Error updating MCQ result:', err);
      return res.status(500).json({ error: 'Error updating MCQ result' });
    }

    res.json({ success: true });
  });
});

// GeneratedKey Availability Check
app.get('/check-key-availability/:key', (req, res) => {
  const key = req.params.key;

  const table = key.startsWith('c') ? 'imported_crosswords'
             : key.startsWith('m') ? 'imported_mcqs'
             : null;

  if (!table) {
    return res.status(400).json({ available: false, error: 'Invalid key prefix.' });
  }

  const sql = `SELECT 1 FROM ${table} WHERE generatedKey = ? LIMIT 1`;
  connection.query(sql, [key], (err, results) => {
    if (err) {
      console.error('Error checking key availability:', err);
      return res.status(500).json({ available: false, error: 'Database error' });
    }

    const isAvailable = results.length === 0;
    res.json({ available: isAvailable });
  });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Elementary Quiz Generator API running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Target: English Quiz Generation for Grade 3-4`);
});