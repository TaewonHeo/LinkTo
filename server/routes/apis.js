'use strict';

import _ from 'lodash';
import controllers from './controllers/tables';
import express from 'express';

const router = express.Router();

router.use('/controllers', controllers);

router.use((req, res, next) => {
    next();
});

export default router;
