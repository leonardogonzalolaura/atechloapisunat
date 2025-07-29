/** 
 * @swagger
 * /apisunat/health:
 *   get:
 *     summary: Health check
 *     description: Check the health of the API
 *     responses:
 *       200:
 *         description: OK
*/
module.exports = (req, res) => res.send('OK');