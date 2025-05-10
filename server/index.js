require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const util = require('util');
const axios = require('axios')
const qs = require('querystring');
const jwt =require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const app = express();

app.use(cors());

const port = 8000;
app.use('/img', express.static('img'));

const JWT_SECRET = process.env.JWT_SECRET ;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);




const db = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'rout',
  database: 'Project_db'
});

db.connect()
  .then(client => {
    console.log('Connected to PostgreSQL pool!');
    client.release(); // release the connection back to the pool
  })
  .catch(err => {
    console.error('Failed to connect to PostgreSQL:', err);
  });

module.exports = db;

db.query = util.promisify(db.query);


// ✅ Stripe webhook route with raw body parser
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed.', err.message);
    return res.sendStatus(400);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const bookingIds = JSON.parse(paymentIntent.metadata.bookingIds); // Assume this is a JSON array of IDs

    try {
      // Mark each booking as paid
      for (const bookingId of bookingIds) {
        await db.query(
          'UPDATE bookings SET booking_status = $1 WHERE booking_id = $2',
          ['confirmed', bookingId]
        );
        console.log(`✅ Booking ${bookingId} marked as paid.`);
      }

      // Insert payment record into payments table
      const { payment_method, amount } = paymentIntent;
      const paymentMethod = await stripe.paymentMethods.retrieve(payment_method);
      const cardBrand = paymentMethod.card?.brand;
      const paymentResult = await db.query(
        'INSERT INTO payments (payment_method, amount) VALUES ($1, $2) RETURNING payments_id',
        [cardBrand, amount/100]
      );
      const paymentId = paymentResult.rows[0].payments_id;
      console.log(`💳 Payment inserted with ID ${paymentId}.`);

      // Link payment to bookings
      for (const bookingId of bookingIds) {
        await db.query(
          'INSERT INTO payment_bookings (payment_id, booking_id) VALUES ($1, $2)',
          [paymentId, bookingId]
        );
        console.log(`🔗 Linked payment ${paymentId} to booking ${bookingId}.`);
      }

    } catch (err) {
      console.error('❌ Error processing payment and bookings:', err);
      return res.sendStatus(500); // Optional: fail webhook so Stripe retries
    }
  }

  res.status(200).end(); // Acknowledge receipt to Stripe
});
app.use(express.json());


// ✅ JSON body parser AFTER webhook

const cron = require('node-cron');

// Run this every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const result = await db.query(`
      UPDATE bookings
      SET booking_status = 'cancelled'
      WHERE booking_status = 'pending'
        AND booking_timestamp < NOW() - INTERVAL '30 minutes'
      RETURNING booking_id
    `);
    
    if (result.rows.length > 0) {
      const ids = result.rows.map(row => row.booking_id).join(', ');
      console.log(`Old pending bookings cancelled: ${ids}`);
    } else {
      console.log('No old pending bookings to cancel.');
    }

  } catch (err) {
    console.error('Error cancelling old bookings:', err);
  }
});


const createUploaderForFolder = (folderName) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, 'img', folderName);

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });

  return multer({ storage }).single('image');
};


const uploadregister = createUploaderForFolder('Userprofile');

const uploadMovies = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, 'img', 'MoviePosters');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
}).fields([
  { name: 'poster', maxCount: 1 },
  { name: 'other_img', maxCount: 1 }
]);

const upload = multer();


// Upload endpoint: /upload/profile or /upload/product

app.get('/Homepage', async (req, res) => {
  try{
    const result = await db.query(`
      (SELECT m.movie_id,m.title,m.genre,TO_CHAR(m.release_date, 'DD Month YYYY') As release_date,m.poster_img,m.background_img,'Recommend' AS status
      FROM movies m
      LEFT JOIN showtimes st ON st.movie_id = m.movie_id
      LEFT JOIN bookings b ON b.show_id = st.show_id
      WHERE release_date <= CURRENT_DATE AND endeddate >= CURRENT_DATE
      GROUP BY m.movie_id, m.title, m.genre, m.release_date, m.poster_img, m.background_img
      ORDER BY COUNT(booking_status = 'confirmed') DESC
      LIMIT 4)

      UNION ALL

      (SELECT movie_id,title, genre,TO_CHAR(release_date, 'DD Month YYYY') As release_date,poster_img,background_img,'Currently play' AS status
      FROM movies
      WHERE release_date <= CURRENT_DATE AND endeddate >= CURRENT_DATE)

      UNION ALL

      (SELECT movie_id,title,genre,TO_CHAR(release_date, 'DD Month YYYY') As release_date,poster_img,background_img,'Upcoming' AS status
      FROM movies
      WHERE release_date > CURRENT_DATE);
      `)
    console.log('HomePage get movie data.');
    res.status(200).json(result.rows);
  }catch(error){
    console.error('Error fetching users:',error.message);
    res.status(500).json({error:'Error fetching users'});
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body; // correctly get email/password

    const row = await db.query('SELECT email, password,user_id,role FROM users WHERE email = $1', [email]);
    const result = row.rows;
    if (result.length === 1) {
      const user = result[0];
      console.log(user);

      if (user.password === password) {
        const token = jwt.sign({user_ID : user.user_id}, JWT_SECRET , { expiresIn: "1h" });
        console.log(token);
        res.status(200).json({token,Role : user.role});
      } else {
        res.status(401).json({ error: true, message: 'Incorrect password' });
      }
    } else {
      res.status(404).json({ error: true, message: 'User not found' });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
});

app.post('/register', uploadregister, async (req, res) => {
  try {
    const { email, password, fname, username, gender } = req.body;
    const imagePath = req.file ? `/img/userProfile/${req.file.filename}` : null;  // Handle image path

    const query = `INSERT INTO users (email, password, fname, username, gender, profile) VALUES ($1, $2, $3, $4, $5::gender_enum, $6) RETURNING user_id`;
    const insertresult = await db.query(query, [email, password, fname, username, gender, imagePath]);

    if (insertresult.rows[0].user_id) {
      console.log('Register success');
      const token = jwt.sign({ user_ID: insertresult.rows[0].user_id}, process.env.JWT_SECRET, { expiresIn: "3h" });
      res.status(200).json({ token });
    } else {
      res.status(400).json({ error: true, message: 'Registration failed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
});
  
app.get('/auth',async (req,res)=>{
  try{
    const token=req.headers['authorization'];
    let authtoken;
    if(token){
      authtoken = token.split(' ')[1];
    }
    console.log("Get authToken.");
    const id = jwt.verify(authtoken,JWT_SECRET);
    const result = await db.query('SELECT user_id,role,profile FROM users WHERE user_id = $1', [id.user_ID]);
    if(result.rows.length > 0){
      console.log('User are on login status found.');
      res.status(200).json({auth: true,Role : result.rows[0].role,profile_img :result.rows[0].profile});
    }else{
      throw new error('not data');
    }
  }catch{
    console.error(error);
    res.status(403).json({message : 'authentication fail'});
  }
});

app.get('/userinfo',async (req,res)=>{
  try{
    const token=req.headers['authorization'];
    let authtoken;
    if(token){
      authtoken = token.split(' ')[1];
    }
    const id = jwt.verify(authtoken,JWT_SECRET);
    console.log('User are on login status found.')
    const result = await db.query(`SELECT user_id,fname,email,gender,username,TO_CHAR(join_date, 'DD Month YYYY') AS join_date,profile FROM users WHERE user_id = $1`, [id.user_ID]);
    if(result.rows.length === 1){
      console.log('User get their info.')
      res.status(200).json(result.rows[0]);
    }else{
      throw new error('not data');
    }
  }catch{
    console.error(error);
    res.status(403).json({message : 'authentication fail'});
  }
});

app.get('/choose_th', async (req, res) => {
  try {
    const movieId = req.query.id;
    console.log('Request movie info of',movieId,'.');

    let movie_detail = await db.query(
      `SELECT m.movie_id, m.poster_img, m.title, m.genre, m.duration, m.description,
              TO_CHAR(m.release_date, 'DD Month YYYY') AS release_date,
              STRING_AGG(DISTINCT s.language, ', ') AS all_languages,
              TO_CHAR(MIN(s.date_time), 'YYYY-MM-DD') AS next_show_date
       FROM showtimes s
       JOIN movies m ON m.movie_id = s.movie_id
       WHERE m.movie_id = $1 AND s.date_time >= CURRENT_DATE
       GROUP BY m.movie_id, m.title, m.genre, m.duration, m.description, m.release_date, m.poster_img;`,
      [movieId]
    );

    // If no upcoming showtimes, fetch basic movie details
    if (movie_detail.rows.length === 0) {
      movie_detail = await db.query(
        `SELECT m.movie_id, m.poster_img, m.title, m.genre, m.duration, m.description,
                TO_CHAR(m.release_date, 'DD Month YYYY') AS release_date,
                STRING_AGG(DISTINCT s.language, ', ') AS all_languages,
                TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS next_show_date
         FROM showtimes s
         RIGHT JOIN movies m ON m.movie_id = s.movie_id
         WHERE m.movie_id = $1
         GROUP BY m.movie_id, m.title, m.genre, m.duration, m.description, m.release_date, m.poster_img;`,
        [movieId]
      );
    }
    console.log('Get movie info success.')
    res.status(200).json(movie_detail.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
});


app.get('/showtime', async (req, res) => {
  try {
    const movieId = req.query.id;
    const day = req.query.date;

    console.log('Request showtimes of movie id : ',movieId,'.\nOn : ',day,'.');

    const result = await db.query(
      `(SELECT s.show_id, t.tname, TO_CHAR(s.date_time, 'HH24:MI') AS time, s.language, 'past' AS status
        FROM showtimes s
        JOIN theaters t ON s.theater_id = t.theater_id
        WHERE s.movie_id = $1
        AND DATE(s.date_time) = $2
        AND s.date_time <= NOW() + INTERVAL '30 minutes'
        )
        UNION ALL
        (
        SELECT s.show_id, t.tname, TO_CHAR(s.date_time, 'HH24:MI') AS time, s.language, 'Curr' AS status
        FROM showtimes s
        JOIN theaters t ON s.theater_id = t.theater_id
        WHERE s.movie_id = $1
        AND DATE(s.date_time) = $2
        AND s.date_time > NOW() + INTERVAL '30 minutes'
        )
        ORDER BY tname, show_id;
        `,
      [movieId, day]
    );

    const rows = result.rows;

    if (rows.length === 0) {
      console.log('No showtimes found');
      return res.status(404).json({ error: true, message: 'No showtimes found' });
    }

    // Group showtimes by theater
    const grouped = {};

    rows.forEach(row => {
      const theaterId = row.tname;

      if (!grouped[theaterId]) {
        grouped[theaterId] = {
          theater: theaterId,
          show_info: []
        };
      }

      grouped[theaterId].show_info.push({
        lan: row.language,
        s_id: row.show_id,
        time: row.time,
        status:row.status
      });
    });

    // Convert object to array
    const response = Object.values(grouped);
    console.log('Get show times success');
    res.status(200).json(response);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
});


app.get('/seat_status', async (req, res) => {
  try {
    const showId = req.query.id;

    console.log('Request seat status show:', showId);

    const result = await db.query(
      `SELECT s.theater_id,s.seat_id,s.seat_label,s.seat_type,b.booking_status, t.row_seat,t.column_seat
      FROM showtimes st
      INNER JOIN theaters t ON st.theater_id = t.theater_id
      INNER JOIN seats s ON s.theater_id = t.theater_id
      LEFT JOIN bookings b ON b.seat_id =s.seat_id AND b.show_id = st.show_id AND b.booking_status <> 'cancelled'
      WHERE st.show_id=$1
      ORDER by s.seat_label DESC`,
      [showId]
    );

    const rows = result.rows;

    if (rows.length === 0) {
      return res.status(404).json({ error: true, message: 'No showtimes found' });
    }

    
    res.status(200).json(rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
});

app.post('/create-payment-intent', async (req, res) => {
  const { amount, bookingIds } = req.body; // Destructure bookingIds from request body

  try {
    // Create the PaymentIntent with metadata for bookingIds
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'thb',
      payment_method_types: ['card'],
      metadata: {
        bookingIds: JSON.stringify(bookingIds), // Convert bookingIds array to JSON string
      },
    });

    // Send back the clientSecret and paymentIntent ID
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id, // Optional: send paymentIntent ID for tracking
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});


app.post('/Booking_confirm', async (req, res) => {
  const { seat_id, show_id } = req.body;
  const token = req.headers['authorization'];

  if (!token) return res.status(401).json({ error: 'Authorization token required' });

  try {
    const authtoken = token.split(' ')[1];
    const decoded = jwt.verify(authtoken, JWT_SECRET);
    const userId = decoded.user_ID;

    if (!Array.isArray(seat_id) || seat_id.length === 0) {
      return res.status(400).json({ error: 'seat_id must be a non-empty array.' });
    }

    const checkQuery = `
      SELECT booking_id FROM bookings
      WHERE seat_id = ANY($1) AND show_id = $2 AND booking_status != 'cancelled'
    `;
    const result = await db.query(checkQuery, [seat_id,show_id]);

    if (result.rows.length > 0) {
      return res.status(409).json({
        error: 'At least one of the seats you selected has already been booked.',
      });
    }

    const insertQuery = `
      INSERT INTO bookings (user_id, seat_id, booking_status, booking_timestamp, show_id)
      VALUES ($1, $2, 'pending', NOW(), $3) RETURNING booking_id;
    `;
    let booking_id =[];
    for (const seat of seat_id) {
      const bookingresult = await db.query(insertQuery, [userId, seat, show_id]);
      booking_id.push(bookingresult.rows[0].booking_id);
    }

    res.status(201).json({ success: true, message: 'Booking(s) created successfully.',booking_id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error occurred.' });
  }
});

app.get('/DAY_BUY', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT TO_CHAR(booking_timestamp, 'Dy') AS day_abbr, COUNT(booking_id)
      FROM bookings
      WHERE booking_timestamp >= CURRENT_DATE - INTERVAL '30 days' AND booking_status = 'confirmed'
      GROUP BY TO_CHAR(booking_timestamp, 'Dy'), TO_CHAR(booking_timestamp, 'D')
      ORDER BY TO_CHAR(booking_timestamp, 'D')::int;

    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching day-wise bookings:', error);
    res.status(500).json({ message: "Something went wrong" });
  }
});

app.get('/month_sum',async(req,res)=>{
  try {
    const result = await db.query(`
      SELECT COUNT(*) FILTER (WHERE booking_timestamp::date = CURRENT_DATE) AS today_count,COUNT(*) FILTER (WHERE booking_timestamp >= date_trunc('week', CURRENT_DATE)) AS this_week_count,COUNT(*) FILTER (WHERE booking_timestamp >= date_trunc('month', CURRENT_DATE)) AS this_month_count
      FROM bookings
      WHERE booking_status = 'confirmed';

    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching day-wise bookings:', error);
    res.status(500).json({ message: "Something went wrong" });
  }
})

app.get('/register', async (req,res)=>{
  try {
    const result = await db.query(`
      SELECT  COUNT(user_id) AS total_users,COUNT(*) FILTER (WHERE join_date >= CURRENT_DATE - INTERVAL '30 days') AS joined_last_30_days
      FROM users where role = 'user';
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching day-wise bookings:', error);
    res.status(500).json({ message: "Something went wrong" });
  }
})



app.get('/userHistory', async (req, res) => {
  try {
    const token = req.headers['authorization'];
    let authtoken;

    if (token) {
      authtoken = token.split(' ')[1];
    } else {
      throw new Error('Authorization token missing');
    }

    const id = jwt.verify(authtoken, JWT_SECRET);

    const result = await db.query(`
      SELECT 
        m.title, 
        th.tname, 
        TO_CHAR(st.date_time, 'DD Month YYYY') AS date,
        TO_CHAR(st.date_time, 'HH24:MI') AS time, 
        s.seat_label, 
        b.booking_status ,
        m.poster_img
      FROM bookings b
      JOIN showtimes st ON st.show_id = b.show_id
      JOIN movies m ON m.movie_id = st.movie_id
      JOIN seats s ON s.seat_id = b.seat_id
      JOIN theaters th ON th.theater_id = s.theater_id
      WHERE b.user_id = $1 AND b.booking_status != 'cancelled'
      ORDER BY st.date_time;
    `, [id.user_ID]);

    if (result.rows.length > 0) {
      res.status(200).json(result.rows);
    } else {
      res.status(404).json({ message: 'No booking history found' });
    }

  } catch (error) {
    console.error('Error:', error);
    res.status(403).json({ message: 'Authentication failed or query error' });
  }
});

app.get('/paymentMethodCount',async(req,res)=>{
  try{
    const result = await db.query(`
      select p.payment_method, count(*) 
      from payments p
      join payment_bookings pb on p.payments_id = pb.payment_id
      group by payment_method;
    `);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching payMentCount :', error);
    res.status(500).json({ message: "Something went wrong" });
  }
})

app.get('/TopSell',async(req,res)=>{
  try{
    const result = await db.query(`
      SELECT title,SUM(avg_amount)::INT AS revenue,SUM(ticket_count) AS tickets
      FROM (SELECT m.title,p.payments_id,AVG(p.amount) AS avg_amount,COUNT(b.booking_id) AS ticket_count
            FROM movies m
            LEFT JOIN showtimes st ON st.movie_id = m.movie_id
	          LEFT JOIN bookings b ON b.show_id = st.show_id
            LEFT JOIN payment_bookings pb ON pb.booking_id = b.booking_id
            LEFT JOIN payments p ON p.payments_id = pb.payment_id
            WHERE b.booking_status = 'confirmed' AND b.booking_timestamp >= NOW() -  INTERVAL '7 days'
            GROUP BY m.title, p.payments_id) 
      GROUP BY title
      ORDER BY revenue 
      LIMIT 5;

    `);
    res.status(200).json(result.rows);
  }catch(error){
    console.error('Error fetching Top Sell:', error);
    res.status(500).json({ message: "Something went wrong" });
  }
})


// ✅ Movie upload route
app.post('/movie', uploadMovies, async (req, res) => {
  console.log('Admin request for data.')
  try {
    const {
      title,
      releaseDate,
      endedDate,
      genre,
      description
    } = req.body;
    const duration = parseInt(req.body.duration, 10);
    const poster = req.files['poster']?.[0]?.filename|| '';
    const other_img = req.files['other_img']?.[0]?.filename || '';

    console.log('New Movie :\nall',req.body,'poster',poster,'\nother_img',other_img)

    const query = `
      INSERT INTO movies (title, release_date, endeddate, duration,genre, description, poster_img, background_img)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING movie_id
    `;
    const insertresult = await db.query(query, [
      title, releaseDate, endedDate, duration, genre, description,
      `/img/MoviePosters/${poster}`, `/img/MoviePosters/${other_img}`
    ]);

    if (insertresult.rows[0].movie_id) {
      console.log('Movie added successfully');
      res.status(200).json({ message: 'Movie added successfully!', movie: insertresult.rows[0] });
    } else {
      res.status(400).json({ error: true, message: 'Movie insertion failed' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
});

app.get('/movie', async (req, res) => {
  try {
    const result = await db.query(`SELECT movie_id,title,genre,release_date,duration,description,endeddate,poster_img FROM movies;`);

    if (result.rows.length === 0) {
      throw new Error('No movie data found');
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
});

app.put('/movie',upload.none(),async(req,res)=>{
  console.log('Admin request for Update data.');
  try{
    const {
      title,
      releaseDate,
      endedDate,
      genre,
      description,
    } = req.body;
      const duration = parseInt(req.body.duration, 10);
      const id = parseInt(req.body.id, 10);
      const query = `
        Update movies 
        SET title = $1,
            release_date = $2,
            endeddate = $3,
            genre = $4,
            description = $5,
            duration = $6
        Where movie_id = $7
        `;
        const updateresult = await db.query(query, [
        title, releaseDate, endedDate, genre, description,duration,id
    ]);
    if (updateresult.rowCount === 0) {
      console.warn(`No movie found with ID ${id}.`);
      return res.status(404).json({ error: true, message: 'Movie not found or no change made.' });
    }

    res.status(200).json({ success: true, message: 'Movie updated successfully.' });
      
  }catch(error){
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
  
})

app.delete('/movie', async (req, res) => {
  const id = parseInt(req.query.id, 10);
  console.log('Delete at : ',id);
  if (isNaN(id)) {
    return res.status(400).json({ error: true, message: 'Invalid movie ID' });
  }

  try {
    // 1. Get image paths from DB
    const { rows } = await db.query(
      'SELECT poster_img, background_img FROM movies WHERE movie_id = $1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: true, message: 'Movie not found' });
    }

    const { poster_img, background_img } = rows[0];

    // 2. Delete images using absolute paths
    const deleteImage = (relativePath) => {
      if (!relativePath) return;

      const fullPath = path.join(__dirname, relativePath); // handles /img/... directly
      fs.unlink(fullPath, (err) => {
        if (err) {
          console.warn(`Could not delete ${fullPath}:`, err.message);
        } else {
          console.log(`Deleted file: ${fullPath}`);
        }
      });
    };

    deleteImage(poster_img);
    deleteImage(background_img);

    // 3. Delete movie from DB
    await db.query('DELETE FROM movies WHERE movie_id = $1', [id]);

    res.json({ success: true, message: 'Movie and image files deleted successfully' });

  } catch (error) {
    console.error('Delete error:', error.message);
    res.status(500).json({ error: true, message: 'Server error' });
  }
});

app.get('/schedule', async (req,res)=>{
  try {
    const result = await db.query(`SELECT st.show_id,m.movie_id,m.title,st.language,TO_CHAR(st.date_time, 'DD Month YYYY') AS date,TO_CHAR(st.date_time, 'HH24:MI') AS time,t.tname,t.theater_id
                                    FROM showtimes st
                                    JOIN movies m ON m.movie_id = st.movie_id
                                    JOIN theaters t ON t.theater_id = st.theater_id;`);
    if (result.rows.length === 0) {
      throw new Error('No showtime data found');
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
});

app.post('/schedule', upload.none(), async (req, res) => {
  console.log('Admin request to insert data.');
  try {
    console.log('Received schedule data:', req.body);
    const { language, date, time, theater } = req.body;
    const movie_id = parseInt(req.body.movie_id, 10);
    const timestamp = `${date} ${time}`; // Combined input

    // Check if datetime is in the past
    if (new Date(timestamp) < new Date()) {
      return res.status(400).json({ error: true, message: 'Cannot insert past schedule' });
    }

    const result = await db.query(
      `INSERT INTO showtimes (movie_id, theater_id, date_time, language) 
       VALUES ($1, $2, $3, $4) RETURNING show_id`,
      [movie_id, theater, timestamp, language]
    );

    if (result.rows.length === 0) {
      return res.status(500).json({ error: true, message: 'Insert failed' });
    }

    const show_id = result.rows[0].show_id;
    res.status(201).json({ success: true, message: `Inserted schedule with id: ${show_id}` });

  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
});

app.put('/schedule',upload.none(),async(req,res)=>{
  console.log('Admin request for Update data.');
  try{
    console.log('Received schedule data:', req.body);
    const { language, date, time, theater } = req.body;
    const movie_id = parseInt(req.body.movie_id, 10);
    const id = parseInt(req.body.id, 10);
    const timestamp = `${date} ${time}`; // Combined input

    // Check if datetime is in the past
    if (new Date(timestamp) < new Date()) {
      return res.status(400).json({ error: true, message: 'Cannot Update to past schedule' });
    }
    const query = `
        Update showtimes 
        SET movie_id = $1, 
            theater_id = $2, 
            date_time = $3, 
            language =$4
        Where show_id = $5
        `;
    const updateresult = await db.query(query, [movie_id, theater, timestamp, language,id]);
    if (updateresult.rowCount === 0) {
      console.warn(`Update failed for schedule ID ${id}.`);
      return res.status(404).json({ error: true, message: 'Cannot update schedule' });
    }

    res.status(200).json({success: true,  message: 'Schedule update successfully' });

  }catch(error){
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
  
})

app.delete('/schedule', async (req, res) => {
  const id = parseInt(req.query.id, 10);
  console.log('Delete at : ',id);
  if (isNaN(id)) {
    return res.status(400).json({ error: true, message: 'Invalid movie ID' });
  }
  try{
    await db.query('Delete from showtimes where show_id = $1', [id]);
    res.status(200).json({success: true,  message: 'Schedule delete successfully' });
  }catch(error){
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
});



app.get('/theater',async(req,res)=>{
  try {
    const result = await db.query(`SELECT * FROM theaters`);
    if (result.rows.length === 0) {
      throw new Error('No theaters data found');
    }

    console.log('Fetched theaters:', result.rows);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
});


app.post('/theater', upload.none(), async (req, res) => {
  console.log('Admin request to insert data.');
  try {
    console.log('Received theater data:', req.body);

    const {
      theater_id,
      tname,
    } = req.body;
    const row = parseInt(req.body.row, 10);
    const col = parseInt(req.body.column, 10);
    if(row>26){
      console.warn(`Update failed for theater ID ${theater_id}.`);
      return res.status(400).json({ error: true, message: 'Cannot insert theater with more than 26 rows' });
    }

    // Insert into theaters table
    const result = await db.query(
      `INSERT INTO theaters (theater_id, row_seat, column_seat, tname) VALUES ($1, $2, $3, $4)`,
      [theater_id, row, col, tname]
    );

    if (result.rowCount === 0) {
      console.warn(`Insert failed for theater ID ${theater_id}.`);
      return res.status(404).json({ error: true, message: 'Cannot insert theater' });
    }

    // Generate seat values
    let seatValues = [];
    for (let i = row - 1; i >= 0; i--) {
      const row_label = String.fromCharCode(65 + i); // A, B, C...
      for (let j = 1; j <= col; j++) {
        const seat_label = row_label + j;
        const seat_type = i > 1 ? 'Normal' : 'Premium';
        seatValues.push(`('${theater_id}', '${seat_label}', '${seat_type}')`);
      }
    }

    // Join all values and run INSERT
    const seatInsertQuery = `
      INSERT INTO seats (theater_id, seat_label, seat_type) VALUES 
      ${seatValues.join(', ')};
    `;
    await db.query(seatInsertQuery);

    res.status(200).json({ message: 'Theater and seats added successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: true, message: 'Server error' });
  }
});

app.put('/theater',upload.none(),async(req,res)=>{
  console.log('Admin request for Update data.');
  try{
     const {
      id,
      tname,
    } = req.body;
    const row = parseInt(req.body.row, 10);
    const col = parseInt(req.body.column, 10);
    if(row>26){
      console.warn(`Update failed for theater ID ${id}.`);
      return res.status(400).json({ error: true, message: 'Cannot update theater with more than 26 rows' });
    }
    console.log('data receive :\n',req.body);
    const query = `
        Update theaters 
        SET tname = $1,
            row_seat = $2,
            column_seat = $3
        Where theater_id = $4
        `;
    const updateresult = await db.query(query, [tname, row, col, id]);
    if (updateresult.rowCount === 0) {
      console.warn(`Update failed for theater ID ${id}.`);
      return res.status(404).json({ error: true, message: 'Cannot update theater' });
    }

    // Generate seat values
    await db.query('DELETE FROM seats WHERE theater_id = $1', [id]);
    let seatValues = [];
    for (let i = row - 1; i >= 0; i--) {
      const row_label = String.fromCharCode(65 + i); // A, B, C...
      for (let j = 1; j <= col; j++) {
        const seat_label = row_label + j;
        const seat_type = i > 1 ? 'Normal' : 'Premium';
        seatValues.push(`('${id}', '${seat_label}', '${seat_type}')`);
      }
    }

    // Join all values and run INSERT
    const seatInsertQuery = `
      INSERT INTO seats (theater_id, seat_label, seat_type) VALUES 
      ${seatValues.join(', ')};
    `;
    await db.query(seatInsertQuery);

    res.status(200).json({success: true,  message: 'Theater and seats update successfully' });

  }catch(error){
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
  
})

app.get('/user',async(req,res)=>{
  try {
    const result = await db.query(`select profile,username,user_id,fname,gender,email,TO_CHAR(join_date, 'DD Month YYYY') AS join_date from users where role = 'user' order by join_date`);
    if (result.rows.length === 0) {
      throw new Error('No users data found');
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
});


app.delete('/user', async (req, res) => {
  const id = parseInt(req.query.id, 10);
  console.log('Delete at : ',id);
  if (isNaN(id)) {
    return res.status(400).json({ error: true, message: 'Invalid movie ID' });
  }
  try{
    await db.query('Delete from users where user_id = $1', [id]);
    res.status(200).json({success: true,  message: 'Schedule delete successfully' });
  }catch(error){
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
});


app.get('/booking',async(req,res)=>{
  try {
    const result = await db.query(`select booking_id,user_id,seat_label,show_id,booking_status,TO_CHAR(booking_timestamp, 'DD Month YYYY') AS bookingDate
                                    from bookings b
                                    join seats s on s.seat_id = b.seat_id;`);
    if (result.rows.length === 0) {
      throw new Error('No booking data found');
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
});

app.get('/payment',async(req,res)=>{
  try {
    const result = await db.query(`SELECT pb.payment_id,b.booking_id,b.user_id,m.title,payment_method,amount,booking_status AS status
                                    FROM bookings b
                                    FULL OUTER JOIN payment_bookings pb ON pb.booking_id = b.booking_id
                                    FULL OUTER JOIN payments p ON p.payments_id =pb.payment_id
                                    join showtimes st on st.show_id=b.show_id
                                    join movies m ON m.movie_id=st.movie_id
                                    where b.booking_status <>'cancelled'`);
    if (result.rows.length === 0) {
      throw new Error('No payment data found');
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
})

app.get('/showTimeCount',async(req,res)=>{
  try{
    const result = await db.query(`SELECT 
	                                  COUNT(*) AS total,
                                    COUNT(*) FILTER (WHERE m.release_date > NOW()) AS upcoming,
                                    COUNT(*) FILTER (WHERE m.release_date < NOW() AND date_time > NOW()) AS nextcomming,
                                    COUNT(*) FILTER (WHERE date_time <= NOW()) AS past
                                    FROM showtimes st
                                    join movies m on st.movie_id = m.movie_id;`)
    res.status(200).json(result.rows);
  }catch(error){
    console.error('Fetch error:', error.message);
    res.status(500).json({ error: true, message: error.message || 'Server error' });
  }
})






app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
