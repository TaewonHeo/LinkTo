module.exports = {
  db: {
    host: "localhost",
    database: "linkto",
    username: "linkto",
    password: "1234qwer",
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    },
    logging: false
  },
  admin: {
    id: "admin",
    pw: "1234qwer"
  }
}
