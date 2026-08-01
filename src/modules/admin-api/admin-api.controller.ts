import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { AdminApiService } from './admin-api.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentRequestsService } from '../payment-requests/payment-requests.service';


@Controller('admin')
export class AdminApiController {


  constructor(
    private service: AdminApiService,
    private prisma: PrismaService,
    private paymentRequestService: PaymentRequestsService,
  ) {}




  @Get('users')
  async users(){

    return this.service.getUsers();

  }


 @Get('cards')
async cards(){

  const cards = await this.prisma.requisite.findMany({

    include:{
      user:{
        select:{
          id:true,
          username:true,
          firstName:true,
          balance:true,
        }
      }
    }

  });


  return cards;

}


  @Get('users/:id')
  async user(
    @Param('id') id:string
  ){

    return this.service.getUser(Number(id));

  }





  @Post('users/:id/balance')
  async changeBalance(
    @Param('id') id:string,
    @Body() body:{ amount:number }
  ){

    return this.service.updateBalance(
      Number(id),
      body.amount
    );

  }





  @Get('stats')
  async stats() {


    const users = await this.prisma.user.count();



    const balance = await this.prisma.user.aggregate({

      _sum:{
        balance:true,
      },

    });





    const activeCards = await this.prisma.requisite.count({

      where:{
        isActive:true,
      },

    });






    return {

      users,


      balance:
        Number(balance._sum.balance || 0),


      activeCards,

    };


  }

  @Post('payment-requests')
  async createPaymentRequest(@Body() body: { userId: string | number; requisiteId: string | number; amount: number }) {
    return this.paymentRequestService.createRequest(BigInt(body.userId), BigInt(body.requisiteId), Number(body.amount));
  }

  @Get('payment-requests')
  async paymentRequests(@Query('status') status?: string) {
    return this.paymentRequestService.listRequests(status);
  }

  @Get('payment-requests/:id')
  async paymentRequest(@Param('id') id: string) {
    return this.paymentRequestService.getRequest(BigInt(id));
  }



}
