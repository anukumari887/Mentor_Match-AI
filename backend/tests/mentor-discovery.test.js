jest.mock('../src/models/User', () => ({
  find: jest.fn(),
  exists: jest.fn()
}));

jest.mock('../src/models/MentorProfile', () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn()
}));

const User = require('../src/models/User');
const MentorProfile = require('../src/models/MentorProfile');
const mentorController = require('../src/controllers/mentor.controller');
const { mentorQuerySchema } = require('../src/validations/mentor.validation');

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
}

describe('Mentor discovery', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates and bounds mentor search filters', () => {
    expect(mentorQuerySchema.parse({ minPrice: '300', maxPrice: '900', page: '2' })).toMatchObject({
      minPrice: 300,
      maxPrice: 900,
      page: 2,
      limit: 12,
      sort: 'rating'
    });
    expect(mentorQuerySchema.safeParse({ minPrice: '1000', maxPrice: '500' }).success).toBe(false);
    expect(mentorQuerySchema.safeParse({ day: '7' }).success).toBe(false);
    expect(mentorQuerySchema.safeParse({ limit: '51' }).success).toBe(false);
    expect(mentorQuerySchema.safeParse({ arbitrary: 'unsafe' }).success).toBe(false);
  });

  it('escapes search input, applies approved/active filters, and sorts/paginates results', async () => {
    const activeIds = ['active-id'];
    User.find.mockImplementation((filter) => ({
      distinct: jest.fn().mockResolvedValue(filter.name ? ['name-id'] : activeIds)
    }));
    const foundProfile = {
      _id: 'profile-id',
      userId: { _id: 'active-id', name: 'Asha Rao' },
      headline: 'Node.js mentor',
      skills: ['Node.js'],
      pricePerHour: 900
    };
    const query = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([foundProfile])
    };
    MentorProfile.find.mockReturnValue(query);
    MentorProfile.countDocuments.mockResolvedValue(1);
    const req = {
      query: {
        q: 'C++',
        skill: 'Node.js',
        minPrice: '300',
        maxPrice: '1200',
        minRating: '4',
        day: '2',
        sort: 'price_asc',
        page: '2',
        limit: '10'
      }
    };
    const res = createResponse();
    const next = jest.fn();

    await mentorController.getMentors(req, res, next);

    const filter = MentorProfile.find.mock.calls[0][0];
    expect(filter.$and).toEqual(expect.arrayContaining([
      { approvalStatus: 'approved' },
      { userId: { $in: activeIds } },
      { skills: /Node\.js/i },
      { pricePerHour: { $gte: 300, $lte: 1200 } },
      { ratingAvg: { $gte: 4 } },
      { availability: { $elemMatch: { dayOfWeek: 2 } } }
    ]));
    const nameOrText = filter.$and.find((condition) => condition.$or).$or;
    expect(nameOrText[0].headline.source).toBe('C\\+\\+');
    expect(query.sort).toHaveBeenCalledWith({ pricePerHour: 1, ratingAvg: -1 });
    expect(query.skip).toHaveBeenCalledWith(10);
    expect(query.limit).toHaveBeenCalledWith(10);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      items: [expect.objectContaining({ id: 'active-id', name: 'Asha Rao' })],
      total: 1,
      page: 2
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('does not expose unapproved mentor profiles by id', async () => {
    MentorProfile.findOne.mockReturnValue({
      populate: () => ({ lean: async () => null })
    });
    const next = jest.fn();

    await mentorController.getMentor({ params: { id: '507f1f77bcf86cd799439011' } }, createResponse(), next);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404, code: 'NOT_FOUND' }));
    expect(User.exists).not.toHaveBeenCalled();
  });
});