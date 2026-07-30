/**
 * Tests unitarios de `SnacksService` (HU-012).
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Snack } from './entities/snack.entity';
import { SnackCategory } from './enums/snack.enums';
import { SnacksService } from './snacks.service';

describe('SnacksService', () => {
  let service: SnacksService;

  const snackRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnacksService,
        { provide: getRepositoryToken(Snack), useValue: snackRepo },
      ],
    }).compile();
    service = module.get(SnacksService);
  });

  it('listCatalog groups active snacks by category', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 's1',
          name: 'Crispetas',
          description: 'Balde',
          imageUrl: 'https://x/p.png',
          category: SnackCategory.POPCORN,
          price: 18000,
          stock: 10,
          isActive: true,
          promoLabel: null,
          promoPercent: 0,
          cinemaId: null,
        },
        {
          id: 's2',
          name: 'Combo agotado',
          description: 'Sin stock',
          imageUrl: 'https://x/c.png',
          category: SnackCategory.COMBO,
          price: 35000,
          stock: 0,
          isActive: true,
          promoLabel: null,
          promoPercent: 0,
          cinemaId: null,
        },
      ]),
    };
    snackRepo.createQueryBuilder.mockReturnValue(qb);

    const result = await service.listCatalog({});
    expect(result.totalItems).toBe(2);
    expect(result.categories).toHaveLength(2);
    const soldOut = result.categories
      .flatMap((c) => c.items)
      .find((i) => i.id === 's2');
    expect(soldOut?.available).toBe(false);
  });

  it('assertPurchasable rejects stock 0 (RN-049)', async () => {
    snackRepo.findOne.mockResolvedValue({
      id: 's2',
      name: 'Combo agotado',
      isActive: true,
      stock: 0,
      price: 35000,
      promoPercent: 0,
      cinemaId: null,
      imageUrl: 'x',
    });

    await expect(
      service.assertPurchasable('s2', 1, 'cine-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assertPurchasable applies product promo percent', async () => {
    snackRepo.findOne.mockResolvedValue({
      id: 's1',
      name: 'Crispetas',
      isActive: true,
      stock: 50,
      price: 10000,
      promoPercent: 10,
      cinemaId: null,
      imageUrl: 'x',
    });

    const result = await service.assertPurchasable('s1', 2, null);
    expect(result.unitPrice).toBe(9000);
  });

  it('assertPurchasable throws NotFound when missing', async () => {
    snackRepo.findOne.mockResolvedValue(null);
    await expect(
      service.assertPurchasable('missing', 1),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
