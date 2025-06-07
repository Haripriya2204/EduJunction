module.exports = {
  development: {
    username: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    database: "postgres",
    host: process.env.SUPABASE_DB_HOST,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
  test: {
    username: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    database: "postgres",
    host: process.env.SUPABASE_DB_HOST,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
  production: {
    username: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    database: "postgres",
    host: process.env.SUPABASE_DB_HOST,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
