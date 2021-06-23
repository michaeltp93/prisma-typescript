import express, { Response, Request, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const app = express();

app.use(express.json());

// middleware
const userValidationRules = [
	body('email')
		.isLength({ min: 1 })
		.withMessage('Email must not empty')
		.isEmail()
		.withMessage('Must be a valid address'),
	body('name').isLength({ min: 1 }).withMessage('Name must not empty'),
	body('role')
		.isIn(['ADMIN', 'USER', 'SUPERADMIN', undefined])
		.withMessage(`Role must be ob of 'ADMIN', 'USER', 'SUPERADMIN'`),
];

const postsValidationRules = [
	body('title').isLength({ min: 1 }).withMessage('Title must not empty'),
];

const simpleValidationResult = validationResult.withDefaults({
	formatter: err => err.msg,
});

const checkForErrors = (req: Request, res: Response, next: NextFunction) => {
	const errors = simpleValidationResult(req);
	if (!errors.isEmpty()) return res.status(400).json(errors.mapped());
	return next();
};

// Create User
app.post('/users', userValidationRules, checkForErrors, async (req: Request, res: Response) => {
	const { name, email, role } = req.body;
	try {
		const userIn = await prisma.user.findUnique({ where: { email } });

		if (userIn) throw { email: 'Email already exists' };

		const user = await prisma.user.create({
			data: { name, email, role },
		});

		return res.json(user);
	} catch (error) {
		console.log({ error });
		return res.status(400).json(error);
	}
});

// show users
app.get('/users', async (_, res) => {
	try {
		const users = await prisma.user.findMany({
			select: {
				uuid: true,
				name: true,
				role: true,
				posts: {
					select: {
						title: true,
						content: true,
					},
				},
			},
		});
		return res.json(users);
	} catch (error) {
		console.log({ error });
		return res.status(500).json({ error: 'Something was wrong' });
	}
});

app.put(
	'/users/:uuid',
	userValidationRules,
	checkForErrors,
	async (req: Request, res: Response) => {
		const { name, email, role } = req.body;
		try {
			let user = await prisma.user.findUnique({ where: { uuid: req.params.uuid } });

			if (!user) throw { user: 'user does not exists' };

			user = await prisma.user.update({
				where: { uuid: req.params.uuid },
				data: { name, email, role },
			});

			return res.json(user);
		} catch (error) {
			console.log({ error });
			return res.status(404).json(error);
		}
	}
);

// Delete user
app.delete('/users/:uuid', async (req, res) => {
	const { uuid } = req.params;
	try {
		await prisma.user.delete({ where: { uuid } });
		return res.json({ message: 'User deleted successfully' });
	} catch (error) {
		console.log({ error });
		return res.status(500).json({ error: 'Something was wrong' });
	}
});

// Find
app.get('/users/:uuid', async (req, res) => {
	const { uuid } = req.params;
	try {
		const user = await prisma.user.findUnique({ where: { uuid } });

		return res.json(user);
	} catch (error) {
		console.log({ error });
		return res.status(404).json({ user: 'User not found' });
	}
});

// Create Post
app.post('/posts', postsValidationRules, checkForErrors, async (req: Request, res: Response) => {
	const { title, content, uuid } = req.body;
	try {
		const post = await prisma.post.create({
			data: { title, content, author: { connect: { uuid } } },
		});

		return res.json(post);
	} catch (error) {
		console.log({ error });
		return res.status(400).json(error);
	}
});

// Get post
app.get('/posts', async (_, res) => {
	try {
		const posts = await prisma.post.findMany({
			orderBy: { createdAt: 'desc' },
			include: { author: true },
		});

		return res.json(posts);
	} catch (error) {
		console.log({ error });
		return res.status(404).json({ user: 'User not found' });
	}
});

// start server
const main = async () => {
	app.listen(5001, () => {
		console.log('Server running on PORT, 5001');
	});
};

main();
