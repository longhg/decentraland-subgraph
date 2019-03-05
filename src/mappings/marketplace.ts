import {} from '@graphprotocol/graph-ts'
import {
  OrderCreated,
  OrderSuccessful,
  OrderCancelled,
  AuctionCreated,
  AuctionSuccessful,
  AuctionCancelled,
} from '../types/Marketplace/Marketplace'
import {Decentraland, Order, Parcel, User} from '../types/schema'
import {Address} from "@graphprotocol/graph-ts";
import {LANDRegistry} from "../types/LANDRegistry/LANDRegistry";

/*
Note - a legacy auction is very similar to an order. an order is updated to include
       the nft ID. When createOrder is called without the nftAddress, it emits the
       legacy event AuctionCreated
       Both Auction and Order as stored as Orders in the schema. with a flag indicating
       if it was legacy.
 */

export function handleOrderCreated(event: OrderCreated): void {
  let orderID = event.params.id.toHex()
  let assetID = event.params.assetId.toHex() // ID of the published NFT

  // Create the order
  let order = new Order(orderID)
  if (event.params.nftAddress.toHex() == "0x959e104e1a4db6317fa58f8295f586e1a978c297"){
    order.type = 'estate'
    order.estate = assetID
  } else {
    order.type = 'parcel'
    order.parcel = assetID
  }
  order.status = 'open'
  order.txHash = event.transaction.hash
  order.owner = event.params.seller
  order.price = event.params.priceInWei
  order.expiresAt = event.params.expiresAt
  order.blockNumber = event.block.number
  order.timeCreated = event.block.timestamp
  order.timeUpdatedAt = event.block.timestamp
  order.marketplace = event.address
  order.nftAddress = event.params.nftAddress
  order.save()

  // Set the active order of the parcel
  let parcel = Parcel.load(assetID)
  if (parcel == null) {
    parcel = new Parcel(assetID)
    let registry = LANDRegistry.bind(Address.fromString("0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d"))
    let coordinate = registry.decodeTokenId(event.params.assetId)
    parcel.x = coordinate.value0
    parcel.y = coordinate.value1
    parcel.owner = event.params.seller

    let decentraland = Decentraland.load("1")
    if (decentraland == null){
      decentraland = new Decentraland("1")
      decentraland.landCount = 0
      decentraland.estateCount = 0
    }
    let landLength = decentraland.landCount
    landLength = landLength + 1
    decentraland.landCount = landLength
    decentraland.save()
  } else {
    // Here we are setting old orders as cancelled, because the samrt contract allows new orders to be created
    // and they just overwrite them in place. But the subgraph stores all orders ever
    // you can also overwrite ones that are expired
    let oldOrder = Order.load(parcel.activeOrder)
    if (oldOrder != null){
      oldOrder.status = 'cancelled'
      oldOrder.timeUpdatedAt = event.block.timestamp
    }
  }
  parcel.updatedAt = event.block.timestamp
  parcel.activeOrder = orderID
  parcel.orderOwner = event.params.seller
  parcel.orderPrice = event.params.priceInWei
  parcel.save()

  let user = new User(event.params.seller.toHex())
  user.parcels = []
  user.estates = []
  user.save()
}

export function handleOrderSuccessful(event: OrderSuccessful): void {
  let orderID = event.params.id.toHex()
  let parcelId = event.params.assetId.toHex()

  // Mark the order as sold
  let order = new Order(orderID)
  order.type = 'parcel'
  order.status = 'sold'
  order.buyer = event.params.buyer
  order.price = event.params.totalPrice
  order.timeUpdatedAt = event.block.timestamp
  order.nftAddress = event.params.nftAddress
  order.save()

  // Update the parcel owner and active order
  let parcel = Parcel.load(parcelId)
  if (parcel == null) {
    parcel = new Parcel(parcelId)
    let registry = LANDRegistry.bind(Address.fromString("0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d"))
    let coordinate = registry.decodeTokenId(event.params.assetId)
    parcel.x = coordinate.value0
    parcel.y = coordinate.value1

    let decentraland = Decentraland.load("1")
    if (decentraland == null){
      decentraland = new Decentraland("1")
      decentraland.landCount = 0
      decentraland.estateCount = 0
    }
    let landLength = decentraland.landCount
    landLength = landLength + 1
    decentraland.landCount = landLength
    decentraland.save()
  }
  parcel.owner = event.params.buyer
  parcel.updatedAt = event.block.timestamp
  parcel.lastTransferredAt = event.block.timestamp
  parcel.activeOrder = null
  parcel.orderOwner = null
  parcel.orderPrice = null
  parcel.save()

  let user = new User(event.params.buyer.toHex())
  user.parcels = []
  user.estates = []
  user.save()
}

export function handleOrderCancelled(event: OrderCancelled): void {
  let orderID = event.params.id.toHex()
  let parcelId = event.params.assetId.toHex()

  // Mark the order as cancelled
  let order = new Order(orderID)
  order.type = 'parcel'
  order.status = 'cancelled'
  order.timeUpdatedAt = event.block.timestamp
  order.nftAddress = event.params.nftAddress
  order.save()

  // Clear the active order of the parcel
  let parcel = Parcel.load(parcelId)
  if (parcel == null) {
    parcel = new Parcel(parcelId)
    let registry = LANDRegistry.bind(Address.fromString("0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d"))
    let coordinate = registry.decodeTokenId(event.params.assetId)
    parcel.x = coordinate.value0
    parcel.y = coordinate.value1
    parcel.owner = event.params.seller

    let decentraland = Decentraland.load("1")
    if (decentraland == null){
      decentraland = new Decentraland("1")
      decentraland.landCount = 0
      decentraland.estateCount = 0
    }
    let landLength = decentraland.landCount
    landLength = landLength + 1
    decentraland.landCount = landLength
    decentraland.save()
  }
  parcel.updatedAt = event.block.timestamp
  parcel.activeOrder = null
  parcel.orderOwner = null
  parcel.orderPrice = null
  parcel.save()
}

// Where event AuctionCreated creates an Order - the updated name
export function handleAuctionCreated(event: AuctionCreated): void {
  let orderID = event.params.id.toHex()
  let parcelId = event.params.assetId.toHex()

  // Create the order
  let order = new Order(orderID)
  order.type = 'parcel'
  order.parcel = parcelId
  order.status = 'open'
  order.txHash = event.transaction.hash
  order.owner = event.params.seller
  order.price = event.params.priceInWei
  order.expiresAt = event.params.expiresAt
  order.blockNumber = event.block.number
  order.timeCreated = event.block.timestamp
  order.timeUpdatedAt = event.block.timestamp
  order.marketplace = event.address
  order.save()

  // Set the active order of the parcel
  let parcel = Parcel.load(parcelId)
  if (parcel == null) {
    parcel = new Parcel(parcelId)
    let registry = LANDRegistry.bind(Address.fromString("0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d"))
    let coordinate = registry.decodeTokenId(event.params.assetId)
    parcel.x = coordinate.value0
    parcel.y = coordinate.value1
    parcel.owner = event.params.seller

    let decentraland = Decentraland.load("1")
    if (decentraland == null){
      decentraland = new Decentraland("1")
      decentraland.landCount = 0
      decentraland.estateCount = 0
    }
    let landLength = decentraland.landCount
    landLength = landLength + 1
    decentraland.landCount = landLength
    decentraland.save()
  } else {
    // Here we are setting old orders as cancelled, because the samrt contract allows new orders to be created
    // and they just overwrite them in place. But the subgraph stores all orders ever
    // you can also overwrite ones that are expired
    let oldOrder = Order.load(parcel.activeOrder)
    if (oldOrder != null){
      oldOrder.status = 'cancelled'
      oldOrder.timeUpdatedAt = event.block.timestamp
    }
  }
  parcel.activeOrder = orderID
  parcel.updatedAt = event.block.timestamp
  parcel.orderOwner = event.params.seller
  parcel.orderPrice = event.params.priceInWei
  parcel.save()

  let user = new User(event.params.seller.toHex())
  user.parcels = []
  user.estates = []
  user.save()
}

// Where event AuctionCancelled creates an Order - the updated name
export function handleAuctionCancelled(event: AuctionCancelled): void {
  let orderID = event.params.id.toHex()
  let parcelId = event.params.assetId.toHex()

  // Mark the order as cancelled
  let order = new Order(orderID)
  order.type = 'parcel'
  order.status = 'cancelled'
  order.timeUpdatedAt = event.block.timestamp
  order.save()

  // Clear the active order of the parcel
  let parcel = Parcel.load(parcelId)
  if (parcel == null) {
    parcel = new Parcel(parcelId)
    let registry = LANDRegistry.bind(Address.fromString("0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d"))
    let coordinate = registry.decodeTokenId(event.params.assetId)
    parcel.x = coordinate.value0
    parcel.y = coordinate.value1
    parcel.updatedAt = event.block.timestamp
    parcel.owner = event.params.seller

    let decentraland = Decentraland.load("1")
    if (decentraland == null){
      decentraland = new Decentraland("1")
      decentraland.landCount = 0
      decentraland.estateCount = 0
    }
    let landLength = decentraland.landCount
    landLength = landLength + 1
    decentraland.landCount = landLength
    decentraland.save()
  }

  parcel.activeOrder = null
  parcel.orderOwner = null
  parcel.orderPrice = null
  parcel.save()
}

// Where event AuctionSuccessful creates an Order - the updated name
export function handleAuctionSuccessful(event: AuctionSuccessful): void {
  let orderID = event.params.id.toHex()
  let parcelId = event.params.assetId.toHex()

  // Mark the order as sold
  let order = new Order(orderID)
  order.type = 'parcel'
  order.status = 'sold'
  order.buyer = event.params.winner
  order.price = event.params.totalPrice
  order.timeCreated = event.block.timestamp
  order.timeUpdatedAt = event.block.timestamp
  order.save()

  // Update the parcel owner and active orderID
  let parcel = Parcel.load(parcelId)
  if (parcel == null) {
    parcel = new Parcel(parcelId)
    let registry = LANDRegistry.bind(Address.fromString("0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d"))
    let coordinate = registry.decodeTokenId(event.params.assetId)
    parcel.x = coordinate.value0
    parcel.y = coordinate.value1
    parcel.updatedAt = event.block.timestamp

    let decentraland = Decentraland.load("1")
    if (decentraland == null){
      decentraland = new Decentraland("1")
      decentraland.landCount = 0
      decentraland.estateCount = 0
    }
    let landLength = decentraland.landCount
    landLength = landLength + 1
    decentraland.landCount = landLength
    decentraland.save()
  }
  parcel.owner = event.params.winner
  parcel.lastTransferredAt = event.block.timestamp
  parcel.activeOrder = null
  parcel.orderOwner = null
  parcel.orderPrice = null
  parcel.save()

  let user = new User(event.params.winner.toHex())
  user.parcels = []
  user.estates = []
  user.save()
}