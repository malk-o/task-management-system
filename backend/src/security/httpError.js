// Small helper so services can say "this is a 403 / 404 / 400" without knowing about Express.
// The controller reads err.status and sends it as the HTTP status code.
function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { httpError };
