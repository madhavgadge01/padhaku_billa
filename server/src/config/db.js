import mongoose from 'mongoose';

/**
 * Safely masks MongoDB connection string for logs without exposing credentials.
 */
const maskMongoUri = (uri) => {
  if (!uri) return 'undefined';
  try {
    return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  } catch {
    return '***masked***';
  }
};

export const connectDB = async () => {
  const primaryUrl = process.env.MONGODB_URL;
  const fallbackUri = process.env.MONGODB_URI;

  if (!primaryUrl && !fallbackUri) {
    const errorMsg =
      '[Database Error] Neither MONGODB_URL nor MONGODB_URI is defined in your environment variables. Please configure MONGODB_URL in server/.env.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // Target connection URL (prefer MONGODB_URL)
  const targetUrl = primaryUrl || fallbackUri;
  const maskedTarget = maskMongoUri(targetUrl);

  try {
    console.log(`[Database] Connecting to MongoDB (${maskedTarget})...`);
    const conn = await mongoose.connect(targetUrl, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(
      `[Database] MongoDB Connected Successfully: ${conn.connection.host}/${conn.connection.name}`
    );
    return conn;
  } catch (error) {
    console.error(
      `[Database Connection Failed] Unable to connect to target database (${maskedTarget}):`,
      error.message
    );

    // If target is Atlas and failed (often due to IP Whitelist restriction)
    if (targetUrl.includes('mongodb+srv') || error.message.includes('whitelist') || error.message.includes('buffering timed out')) {
      console.error(
        '\n💡 [Atlas Diagnostic]: If using MongoDB Atlas, verify that your current outbound IP address is added to the cluster IP Access List:'
      );
      console.error('👉 https://www.mongodb.com/docs/atlas/security-whitelist/\n');
    }

    // In local development, if primaryUrl failed and a separate fallbackUri exists, try fallback
    const isDev = process.env.NODE_ENV !== 'production';
    if (isDev && primaryUrl && fallbackUri && primaryUrl !== fallbackUri) {
      const maskedFallback = maskMongoUri(fallbackUri);
      console.warn(
        `[Database Fallback] Attempting development fallback to local MongoDB (${maskedFallback})...`
      );
      try {
        const fallbackConn = await mongoose.connect(fallbackUri, {
          serverSelectionTimeoutMS: 4000,
        });
        console.log(
          `[Database Fallback] Connected to local MongoDB fallback: ${fallbackConn.connection.host}/${fallbackConn.connection.name}`
        );
        return fallbackConn;
      } catch (fallbackError) {
        console.error(
          `[Database Fallback Failed] Local fallback also failed:`,
          fallbackError.message
        );
      }
    }

    throw error;
  }
};
