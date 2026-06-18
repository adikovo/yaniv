const { getAllowedOrigins, corsOrigin } = require('../config');

// CLIENT_ORIGIN controls which browser origins may connect (FR-014). It is read
// at call time so production can lock down while local dev keeps its default.
describe('CORS allowed origins', () => {
  const original = process.env.CLIENT_ORIGIN;
  afterEach(() => {
    if (original === undefined) delete process.env.CLIENT_ORIGIN;
    else process.env.CLIENT_ORIGIN = original;
  });

  test('defaults to the local dev origin when CLIENT_ORIGIN is unset', () => {
    delete process.env.CLIENT_ORIGIN;
    expect(getAllowedOrigins()).toEqual(['http://localhost:5173']);
  });

  test('parses a comma-separated CLIENT_ORIGIN and trims whitespace', () => {
    process.env.CLIENT_ORIGIN = 'https://a.netlify.app, https://b.example.com';
    expect(getAllowedOrigins()).toEqual(['https://a.netlify.app', 'https://b.example.com']);
  });

  test('allows an origin that is in the list', (done) => {
    process.env.CLIENT_ORIGIN = 'https://a.netlify.app';
    corsOrigin('https://a.netlify.app', (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });

  test('rejects an origin that is not in the list', (done) => {
    process.env.CLIENT_ORIGIN = 'https://a.netlify.app';
    corsOrigin('https://evil.example.com', (err) => {
      expect(err).toBeInstanceOf(Error);
      done();
    });
  });

  test('allows non-browser requests with no Origin header', (done) => {
    corsOrigin(undefined, (err, allow) => {
      expect(err).toBeNull();
      expect(allow).toBe(true);
      done();
    });
  });
});
