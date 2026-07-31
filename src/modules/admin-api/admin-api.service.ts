import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminApiService {

  constructor(
    private prisma: PrismaService,
  ) {}


  async getUsers() {

    const users = await this.prisma.user.findMany({

      select: {

        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        balance: true,

        requisites: {
          select: {
            id: true,
            bank: true,
            details: true,
            label: true,
            isActive: true,
          },
        },

      },

      orderBy: {
        createdAt: 'desc',
      },

    });


    return users.map(user => ({

      id: user.id.toString(),

      telegramId: user.telegramId.toString(),

      username: user.username,


      name:
        `${user.firstName || ''} ${user.lastName || ''}`.trim(),


      balance: user.balance.toString(),


      cards: user.requisites.map(card => ({

        id: card.id.toString(),

        bank: card.bank,

        number: card.details,

        name: card.label,

        active: card.isActive,

      })),


    }));

  }



  async getUser(id: number) {


    const user = await this.prisma.user.findUnique({

      where: {
        id: BigInt(id),
      },


      select: {

        id: true,

        telegramId: true,

        username: true,

        firstName: true,

        lastName: true,

        balance: true,


        requisites: {

          select: {

            id: true,

            bank: true,

            details: true,

            label: true,

            type: true,

            isPrimary: true,

            isActive: true,

          },

        },


        deposits: {

          select: {

            id: true,

            amount: true,

            currency: true,

            status: true,

            createdAt: true,

          },


          orderBy: {

            createdAt: 'desc',

          },

        },


        operations: {

          select: {

            id: true,

            type: true,

            amount: true,

            status: true,

            description: true,

            createdAt: true,

          },


          orderBy: {

            createdAt: 'desc',

          },

        },


      },


    });



    if (!user) {
      return null;
    }



    return {


      id: user.id.toString(),


      telegramId: user.telegramId.toString(),


      username: user.username,


      firstName: user.firstName,


      lastName: user.lastName,


      balance: user.balance.toString(),



      requisites: user.requisites.map(card => ({


        id: card.id.toString(),


        bank: card.bank,


        details: card.details,


        label: card.label,


        type: card.type,


        isPrimary: card.isPrimary,


        isActive: card.isActive,


      })),



      deposits: user.deposits.map(deposit => ({


        id: deposit.id.toString(),


        amount: deposit.amount?.toString() ?? '',


        currency: deposit.currency,


        status: deposit.status,


        createdAt: deposit.createdAt,


      })),



      operations: user.operations.map(operation => ({


        id: operation.id.toString(),


        type: operation.type,


        amount: operation.amount?.toString() ?? '0',


        status: operation.status,


        description: operation.description,


        createdAt: operation.createdAt,


      })),


    };


  }



  async updateBalance(
    id: number,
    amount: number,
  ) {


    return this.prisma.user.update({

      where: {

        id: BigInt(id),

      },


      data: {

        balance: {

          increment: amount,

        },

      },


    });


  }


}