import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { User } from './user.entity'
import { UsersService } from './users.service'

describe('AuthService', () => {
    let service: AuthService
    let fakeUsersService: Partial<UsersService>

    beforeEach(async () => {
        const users: User[] = []

        fakeUsersService = {
            find: (email) => {
                const filteredUsers = users.filter(user => user.email === email);
                return Promise.resolve(filteredUsers);
            },
            create: (email: string, password: string) => {
                const user = { id: Math.floor(Math.random() * 99999), email, password } as User
                users.push(user);
                return Promise.resolve(user)
            }
        }

        const module = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: fakeUsersService
                }
            ]
        }).compile()

        service = module.get(AuthService)
    })

    it('can create an instance of the auth service', async () => {
        expect(service).toBeDefined()
    })

    it('creates a new user with a salted and hashed password', async () => {
        const user = await service.signup('test1@test.com', 'test1');

        expect(user.password).not.toEqual('test1');
        const [salt, hash] = user.password.split('.');
        expect(salt).toBeDefined()
        expect(hash).toBeDefined()
    })

    it('throws an error if user signs up with email already in use', async () => {
        await service.signup('test2@test.com', 'test2')
        try {
            await service.signup('test2@test.com', 'test2')
        } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            expect(error.message).toBe('email already in use');
        }
    })

    it('throws if sign in is called with an unused email', async () => {
        try {
            await service.signin('test2@test.com', 'test2')
        } catch (error) {
            expect(error).toBeInstanceOf(NotFoundException);
            expect(error.message).toBe('user not found');
        }
    })

    it('throws if an invalid password is provided', async () => {
        await service.signup('test2@test.com', 'test2')

        try {
            await service.signin('test2@test.com', 'test3')
        } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException)
            expect(error.message).toBe('email or password incorrect')
        }
    })

    it('returns a user if correct password is provided and throws otherwise', async () => {
        try {
            await service.signup('asdf@asf.com', 'weinec');
            const user = await service.signin('asdf@asf.com', 'weinec')
            expect(user).toBeDefined()
        } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            expect(error.message).toBe('email or password incorrect');
        }
    })
})

