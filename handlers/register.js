
/** 
 * @swagger
 * /apisunat/register:
 *   post:
 *     summary: Registrar usuario
 *     description: Registra un nuevo usuario en la API de Sunat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               user:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: OK
 */
const register = (req, res) => {
    res.send('Register')
}

module.exports = register