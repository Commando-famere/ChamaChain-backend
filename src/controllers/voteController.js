const { query } = require('../config/database');
const { recordActivity } = require('../middleware/inactivityCheck');

// Create a new vote
const createVote = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const { motion, description, vote_type, ends_at } = req.body;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (!['chairperson', 'secretary'].includes(roleCheck.rows[0]?.role)) {
            return res.status(403).json({ success: false, message: 'Only chairperson or secretary can create votes' });
        }

        const result = await query(
            `INSERT INTO chama_votes (chama_id, motion, description, vote_type, ends_at, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [chamaId, motion, description, vote_type, ends_at, userId]
        );

        await recordActivity(chamaId, 'vote_created', userId);
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Create vote error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Cast vote
const castVote = async (req, res) => {
    try {
        const { chamaId, voteId } = req.params;
        const { choice } = req.body; // 'for', 'against', 'abstain'
        const userId = req.user.id;

        // Check if user is member
        const memberCheck = await query(
            `SELECT id FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Only members can vote' });
        }

        const vote = await query(
            `SELECT votes_for, votes_against, votes_abstain, status, ends_at FROM chama_votes WHERE id = $1 AND chama_id = $2`,
            [voteId, chamaId]
        );

        if (vote.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Vote not found' });
        }

        if (vote.rows[0].status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Vote is already closed' });
        }

        if (vote.rows[0].ends_at && new Date() > new Date(vote.rows[0].ends_at)) {
            await query(`UPDATE chama_votes SET status = 'closed' WHERE id = $1`, [voteId]);
            return res.status(400).json({ success: false, message: 'Voting period has ended' });
        }

        let votesFor = vote.rows[0].votes_for || [];
        let votesAgainst = vote.rows[0].votes_against || [];
        let votesAbstain = vote.rows[0].votes_abstain || [];

        // Remove user from any previous vote
        votesFor = votesFor.filter(id => id !== userId);
        votesAgainst = votesAgainst.filter(id => id !== userId);
        votesAbstain = votesAbstain.filter(id => id !== userId);

        if (choice === 'for') votesFor.push(userId);
        else if (choice === 'against') votesAgainst.push(userId);
        else if (choice === 'abstain') votesAbstain.push(userId);

        const totalVotes = votesFor.length + votesAgainst.length + votesAbstain.length;

        await query(
            `UPDATE chama_votes 
             SET votes_for = $1, votes_against = $2, votes_abstain = $3, total_votes = $4
             WHERE id = $5`,
            [JSON.stringify(votesFor), JSON.stringify(votesAgainst), JSON.stringify(votesAbstain), totalVotes, voteId]
        );

        await recordActivity(chamaId, 'vote_cast', userId);
        res.json({ success: true, message: 'Vote recorded successfully' });
    } catch (error) {
        console.error('Cast vote error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Close vote and calculate result
const closeVote = async (req, res) => {
    try {
        const { chamaId, voteId } = req.params;
        const userId = req.user.id;

        const roleCheck = await query(
            `SELECT role FROM group_members WHERE chama_id = $1 AND user_id = $2 AND is_active = true`,
            [chamaId, userId]
        );

        if (!['chairperson', 'secretary'].includes(roleCheck.rows[0]?.role)) {
            return res.status(403).json({ success: false, message: 'Only chairperson or secretary can close votes' });
        }

        const vote = await query(
            `SELECT votes_for, votes_against, total_votes, vote_type FROM chama_votes WHERE id = $1 AND chama_id = $2`,
            [voteId, chamaId]
        );

        if (vote.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Vote not found' });
        }

        const votesFor = (vote.rows[0].votes_for || []).length;
        const votesAgainst = (vote.rows[0].votes_against || []).length;
        let result = 'failed';

        if (votesFor > votesAgainst) {
            result = 'passed';
        }

        await query(
            `UPDATE chama_votes SET status = 'closed', result = $1 WHERE id = $2`,
            [result, voteId]
        );

        await recordActivity(chamaId, 'vote_closed', userId);
        res.json({ success: true, message: `Vote closed. Result: ${result}` });
    } catch (error) {
        console.error('Close vote error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all votes for a chama
const getVotes = async (req, res) => {
    try {
        const { chamaId } = req.params;
        const result = await query(
            `SELECT v.*, u.full_name as creator_name
             FROM chama_votes v
             LEFT JOIN users u ON v.created_by = u.id
             WHERE v.chama_id = $1
             ORDER BY v.created_at DESC`,
            [chamaId]
        );
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Get votes error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { createVote, castVote, closeVote, getVotes };
