/** 
 * @swagger
 * /apisunat/health:
 *   get:
 *     tags: [Sistema]
 *     summary: Health check
 *     description: Check the health of the API
 *     security: [] 
 *     responses:
 *       200:
 *         description: OK
*/
module.exports = (req, res) => res.send('OK');