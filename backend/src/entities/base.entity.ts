import {
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @CreateDateColumn({
    type: 'timestamp',
    comment: '创建时间',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    comment: '更新时间',
  })
  updatedAt: Date;
}

export abstract class BaseEntityWithId extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
}