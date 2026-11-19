import jwt from 'jsonwebtoken';

export function signAdminToken(email, expiresIn = '7d') {
  const user = typeof email === 'object' && email !== null
    ? email
    : { email };

  return jwt.sign(
    { id: user.id, email: user.email, role: user.role || 'ADMIN' },
    process.env.JWT_SECRET || 'change_me',
    { expiresIn }
  );
}

export function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requis' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change_me');
    if (payload.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acces interdit' });
    }
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}
