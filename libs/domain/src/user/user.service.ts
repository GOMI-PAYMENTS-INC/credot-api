import { CreateUserDto, UpdateUserDto, UserDto } from '@app/domain/user/dtos';
import { PrismaService } from '@app/utils/prisma';

import { BadRequestException, Injectable } from '@nestjs/common';
import { CrawlingType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getActiveUsers(userId: string | null): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      where: {
        ...(userId && {
          id: Number(userId),
        }),
        NOT: {
          name: {
            startsWith: '조회_',
          },
        },
      },
    });
    return plainToInstance(UserDto, users);
  }

  async findOne(id: number): Promise<UserDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
      },
    });
    return plainToInstance(UserDto, user);
  }

  async create(data: CreateUserDto) {
    const exist = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });
    if (exist) {
      throw new BadRequestException('이미 존재하는 유저입니다.');
    }

    try {
      const encryptedPassword = await bcrypt.hash(
        data.password, // 고정 패스워드
        bcrypt.genSaltSync(),
      );

      const userData = {
        userType: data.type,
        name: data.companyName,
        businessNumber: data.businessNumber,
        companyEmail: data.companyEmail,
        corporateRegistrationNumber: data.corporateRegistrationNumber,
        industryType: data.industryType,
        businessType: data.businessType,
        companyAddress: data.companyAddress,
        managerPosition: data.managerPosition,
        managerName: data.managerName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        bankName: data.bankName,
        bankAccountHolder: data.bankAccountHolder,
        bankAccount: data.bankAccount,
        password: encryptedPassword,
        businessLicenseFileId: data.businessLicenseFileId,
        corporateRegisterFileId: data.corporateRegisterFileId,
        certificateOfCorporateSealFileId: data.certificateOfCorporateSealFileId,
      };

      await this.prisma.$transaction(async (t) => {
        const user = await t.user.create({
          data: userData,
        });

        // 크롤링 데이터가 있을 경우 생성
        if (data.crawlingAccountId && data.crawlingPassword) {
          await t.crawlingInfo.create({
            data: {
              type: data.crawlingType || CrawlingType.CREDIT_FINANCE,
              password: data.crawlingPassword,
              accountId: data.crawlingAccountId,
              User: {
                connect: {
                  id: user.id,
                },
              },
              CrawlingInfoCards: {
                createMany: {
                  data: data.crawlingFranchiseInfos.map((item) => ({
                    cardCompanyName: item.cardCompanyName,
                    franchiseNumber: item.franchiseNumber,
                  })),
                },
              },
            },
          });
        }
      });
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async getUser(memberId: number): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: memberId,
      },
    });
    return plainToInstance(UserDto, user);
  }

  async deleteById(memberId: number): Promise<UserDto> {
    const deleted = await this.prisma.user.delete({
      where: {
        id: memberId,
      },
    });

    return plainToInstance(UserDto, deleted);
  }

  async update({ id, data }: UpdateUserDto) {
    try {
      const updateData = {
        userType: data.type,
        name: data.companyName,
        businessNumber: data.businessNumber,
        corporateRegistrationNumber: data.corporateRegistrationNumber,
        industryType: data.industryType,
        businessType: data.businessType,
        companyAddress: data.companyAddress,
        managerPosition: data.managerPosition,
        limitFutureFund: data.limitFutureFund,
        managerName: data.managerName,
        phoneNumber: data.phoneNumber,
        companyEmail: data.companyEmail,
        bankName: data.bankName,
        bankAccountHolder: data.bankAccountHolder,
        bankAccount: data.bankAccount,
        businessLicenseFileId: data.businessLicenseFileId,
        corporateRegisterFileId: data.corporateRegisterFileId,
        certificateOfCorporateSealFileId: data.certificateOfCorporateSealFileId,
        ...(data.password && {
          password: await bcrypt.hash(data.password, bcrypt.genSaltSync()),
        }),
      };

      await this.prisma.$transaction(async (t) => {
        await t.user.update({
          where: {
            id,
          },
          data: updateData,
        });

        const crawlingInfos = await t.crawlingInfo.findFirst({
          where: {
            userId: id,
          },
        });
        if (crawlingInfos) {
          if (data.crawlingAccountId && data.crawlingPassword) {
            await t.crawlingInfo.update({
              where: {
                id: crawlingInfos.id,
              },
              data: {
                accountId: data.crawlingAccountId,
                password: data.crawlingPassword,
              },
            });
            await Promise.all(
              data.crawlingFranchiseInfos.map((franchiseInfo) =>
                t.crawlingInfoCards.upsert({
                  where: {
                    id: franchiseInfo.id || 0,
                  },
                  update: {
                    franchiseNumber: franchiseInfo.franchiseNumber,
                    cardCompanyName: franchiseInfo.cardCompanyName,
                  },
                  create: {
                    franchiseNumber: franchiseInfo.franchiseNumber,
                    cardCompanyName: franchiseInfo.cardCompanyName,
                    CrawlingInfo: {
                      connect: {
                        id: crawlingInfos.id,
                      },
                    },
                  },
                }),
              ),
            );
          } else {
            await t.crawlingInfo.delete({
              where: {
                id: crawlingInfos.id,
              },
            });
          }
        } else {
          if (data.crawlingAccountId && data.crawlingPassword) {
            await t.crawlingInfo.create({
              data: {
                type: CrawlingType.CREDIT_FINANCE,
                accountId: data.crawlingAccountId,
                password: data.crawlingPassword,
                User: {
                  connect: {
                    id,
                  },
                },
                CrawlingInfoCards: {
                  createMany: {
                    data: data.crawlingFranchiseInfos.map((franchiseInfo) => ({
                      franchiseNumber: franchiseInfo.franchiseNumber,
                      cardCompanyName: franchiseInfo.cardCompanyName,
                    })),
                  },
                },
              },
            });
          }
        }
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error);
    }
  }
}
