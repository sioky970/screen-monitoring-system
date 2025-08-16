import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET') || 'screen-monitoring-secret-key';
    console.log('JWT Strategy - constructor - JWT_SECRET:', configService.get<string>('JWT_SECRET'));
    console.log('JWT Strategy - constructor - using secret:', secret);
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    console.log('=== JWT Strategy - validate START ===');
    console.log('JWT Strategy - validate - payload:', JSON.stringify(payload));
    console.log('JWT Strategy - validate - JWT_SECRET:', process.env.JWT_SECRET);
    console.log('JWT Strategy - validate - payload.sub type:', typeof payload.sub);
    console.log('JWT Strategy - validate - payload.sub value:', payload.sub);
    
    const user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    
    console.log('JWT Strategy - validate - returning user:', JSON.stringify(user));
    console.log('=== JWT Strategy - validate END ===');
    return user;
  }
}